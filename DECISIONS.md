# DECISIONS.md — Key Architectural Choices

## 1. Conversation Memory: Summary + Recent Messages (not full history)

**Choice:** Instead of re-sending the entire conversation to the AI on every turn, we maintain a rolling summary of what the AI has learned, plus only the last 4 messages for immediate context.

**Alternatives considered:**
- Send the full message history every time (simpler, but tokens grow linearly → expensive & slow)
- Use embeddings/RAG to retrieve relevant past messages (complex for this use case)

**Why this approach:**
- Token cost stays roughly constant (~800-1000 tokens per call) regardless of conversation length
- A 20-minute will conversation might have 30+ exchanges. Full history at that point would be ~6000 tokens of input per request. Our approach keeps it under 2000.
- The summary is updated after each exchange using a cheap, small model call, preserving all factual information without the conversational padding.
- Trade-off: occasionally the AI might miss nuance from much earlier in the chat, but for a structured data collection task, the summary captures what matters (facts, not tone).

---

## 2. Structured JSON extraction via response_format

**Choice:** We ask the AI to respond in a strict JSON format with separate `message` and `extracted_data` fields, using OpenAI's `response_format: { type: 'json_object' }`.

**Alternatives considered:**
- Free-form text responses with a separate extraction step (two API calls per turn)
- Function calling / tool_use (more complex, harder to debug)
- Regex/NLP parsing of free-text responses (fragile)

**Why this approach:**
- Single API call handles both conversation and extraction — halves the cost
- JSON mode guarantees parseable output (no regex failures)
- The extraction schema is explicit in the prompt, making it easy to extend (new fields = new schema keys)
- If extraction is ambiguous, the AI sets `extracted_data: null` and asks a clarifying question

---

## 3. Three-state validation: Incomplete / Error / Warning

**Choice:** Validation returns three distinct categories rather than a simple pass/fail.

**Alternatives considered:**
- Boolean isValid flag (loses nuance — user doesn't know what's wrong)
- Single flat list of issues with severity levels (harder to process on the frontend)

**Why this approach:**
- **Incomplete** = not finished yet (the user just hasn't gotten to this part) → show as progress
- **Error** = has a real problem (shares don't add up, contradictions) → block finalization
- **Warning** = noteworthy but not a blocker (witness is also a beneficiary) → inform, don't block
- The frontend can render each category differently, giving users clear feedback
- The AI uses the "incomplete" list to decide what to ask about next

---

## 4. PostgreSQL with explicit schema (not ORM-generated migrations)

**Choice:** Hand-written `init.sql` with explicit table definitions, indexes, and constraints. TypeORM is used as a query/entity layer only (`synchronize: false`).

**Alternatives considered:**
- Let TypeORM auto-generate tables (`synchronize: true`) — risky in production, less control
- Full migration system with versioned files (overkill for this project's scope)

**Why this approach:**
- The schema is the contract. Reviewing `init.sql` tells you everything about the data model in one file.
- Explicit indexes on foreign keys (will_id, asset_id, etc.) ensure we don't hit performance issues on JOINs
- The CHECK constraint on share_percentage and UNIQUE on (asset_id, beneficiary_id) enforce data integrity at the DB level, not just app level
- For a production system, we'd add a proper migration tool (e.g., node-pg-migrate), but for this scope, init.sql + seed.sql is clear and fast to review

---

## 5. Monorepo with separate backend/frontend packages

**Choice:** Single Git repo with `backend/` and `frontend/` as top-level directories, using npm workspaces.

**Alternatives considered:**
- Separate repositories (more isolation but painful for a small team)
- Turborepo/Nx monorepo tooling (overkill for two packages)

**Why this approach:**
- One `docker-compose up` runs everything — fastest path to "runs first try"
- Shared types could easily be added as a third workspace package
- The team reviewing this can clone once and see the full picture
- No cross-repo dependency management headaches

---

## 6. Asset ↔ Beneficiary allocation via a join table with percentage

**Choice:** A separate `asset_allocations` table with `(asset_id, beneficiary_id, share_percentage, conditions)` rather than embedding allocation info in the assets or beneficiaries table.

**Alternatives considered:**
- JSONB column on assets storing allocations (flexible but hard to validate/query)
- Denormalized: store beneficiary info directly on each asset row (duplication)

**Why this approach:**
- Cleanly models the many-to-many relationship: one asset can go to multiple beneficiaries, one beneficiary can inherit from multiple assets
- The `share_percentage` CHECK constraint ensures no negative or >100% values at the DB level
- Easy to validate "do shares add up to 100% per asset?" with a simple GROUP BY query
- The UNIQUE(asset_id, beneficiary_id) constraint prevents accidental duplicate allocations
