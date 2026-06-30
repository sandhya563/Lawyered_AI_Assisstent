import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface AiResponse {
  message: string;
  extractedData: Record<string, any> | null;
}

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
  }

  /**
   * The AI interview strategy:
   * 
   * Instead of re-sending the entire conversation history (which grows expensive),
   * we send:
   * 1. A system prompt with the will-making rules
   * 2. A compact "conversation summary" of what we know so far
   * 3. The last 4 messages for immediate context
   * 4. The user's new message
   * 
   * This keeps token costs O(1) rather than O(n) with conversation length.
   * The summary is updated after each exchange.
   */
  async processMessage(
    userMessage: string,
    conversationSummary: string,
    recentMessages: { role: string; content: string }[],
    missingFields: string[],
    currentWillState: Record<string, any>,
  ): Promise<AiResponse> {
    const systemPrompt = this.buildSystemPrompt(conversationSummary, missingFields, currentWillState);

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...recentMessages.slice(-4).map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: userMessage },
    ];

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const rawContent = response.choices[0]?.message?.content || '{}';

    try {
      const parsed = JSON.parse(rawContent);
      return {
        message: parsed.message || "I'm sorry, I didn't understand that. Could you rephrase?",
        extractedData: parsed.extracted_data || null,
      };
    } catch {
      return {
        message: rawContent,
        extractedData: null,
      };
    }
  }

  /**
   * Generate an updated conversation summary after each exchange.
   * This keeps the context compact for future messages.
   */
  async updateSummary(
    currentSummary: string,
    userMessage: string,
    extractedData: Record<string, any> | null,
  ): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a summarizer. Update the conversation summary below with any new facts from the user's latest message. Keep it concise (under 300 words). Only include confirmed facts about the will.

Current summary:
${currentSummary || 'No information collected yet.'}

New extracted data: ${extractedData ? JSON.stringify(extractedData) : 'None'}`,
        },
        { role: 'user', content: `User said: "${userMessage}". Update the summary.` },
      ],
      temperature: 0.3,
      max_tokens: 400,
    });

    return response.choices[0]?.message?.content || currentSummary;
  }

  private buildSystemPrompt(
    conversationSummary: string,
    missingFields: string[],
    currentWillState: Record<string, any>,
  ): string {
    return `You are a friendly, professional AI will-making assistant. You help people create their legal will by asking simple questions one at a time.

## YOUR RULES:
1. Ask ONE question at a time in simple, warm language.
2. Extract structured facts from the user's messy answers.
3. When something is unclear (e.g., two people with the same name, shares not adding up), ask a clarifying question rather than guessing.
4. Handle changes of mind gracefully (e.g., "actually, make my brother the executor instead").
5. Keep track of what information is still needed.
6. When all required information is collected, let the user know their will is ready.

## WHAT A VALID WILL NEEDS:
- Testator: full name, age, address (and confirmation they are of sound mind)
- Assets: things they own (property, bank accounts, vehicles, jewellery, investments)
- Beneficiaries: who inherits, their relationship, what each gets (shares must = 100% per asset)
- Executor: one trusted person to carry out the will
- Guardian: needed ONLY if testator has children under 18
- Witnesses: at least 2 people (ideally not beneficiaries)
- Signing details: date and place

## WHAT WE KNOW SO FAR:
${conversationSummary || 'Nothing yet - this is the start of the conversation.'}

## CURRENT WILL STATE:
${JSON.stringify(currentWillState, null, 2)}

## STILL MISSING:
${missingFields.length > 0 ? missingFields.join(', ') : 'Nothing! The will appears complete.'}

## RESPONSE FORMAT:
You MUST respond in valid JSON with this structure:
{
  "message": "Your conversational response to the user (the question or acknowledgment)",
  "extracted_data": {
    // Any structured data extracted from the user's message. Use these keys:
    // "testator_full_name", "testator_age", "testator_address", "testator_sound_mind"
    // "assets": [{"description": "...", "asset_type": "property|bank_account|vehicle|jewellery|investment|other", "estimated_value": "..."}]
    // "beneficiaries": [{"full_name": "...", "relationship": "...", "date_of_birth": "YYYY-MM-DD"}]
    // "allocations": [{"asset_description": "...", "beneficiary_name": "...", "share_percentage": 50}]
    // "executor": {"name": "...", "relationship": "..."}
    // "guardian": {"name": "...", "relationship": "..."}
    // "witnesses": [{"full_name": "...", "address": "..."}]
    // "has_minor_children": true/false
    // "signing_date": "YYYY-MM-DD", "signing_place": "..."
    // "remove_executor": true (if user wants to change executor)
    // "remove_guardian": true (if user wants to change guardian)
    // "update_beneficiary": {"old_name": "...", "new_data": {...}}
    // "update_asset": {"old_description": "...", "new_data": {...}}
    // null if nothing to extract
  }
}

Important: If the user's answer is ambiguous or contradictory, set extracted_data to null and ask a clarifying question in your message.`;
  }
}
