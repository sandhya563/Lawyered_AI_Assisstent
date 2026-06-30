# INCIDENT.md — AI "Forgets" Answers & Slow Response Times

## The Problem
Users report that the AI "forgets" answers they gave 10 minutes ago, and replies have slowed to ~12 seconds.

## Initial Triage (first 5 minutes)

I'm on call. Here's my thought process:

**1. Confirm the symptoms are real (not just one user):**
- Check our error monitoring (Sentry/Datadog) — are we seeing elevated error rates or latency?
- Check the application logs for the chat endpoint (`POST /api/chat/:willId/send`)
- Look at the p95 response time over the last hour. If it jumped from ~3s to 12s, this is systemic.

**2. Check the obvious suspects first:**
- Is the OpenAI API itself slow? Check their status page and our outbound request timing.
- Is the database overloaded? Check connection pool usage and query times.

## Hypothesis 1: Summary generation is failing silently

In our design, we call `updateSummary()` after each exchange. If this call fails or times out, the `conversation_summary` field stays stale or becomes `null`. Then on the next turn, the AI has no memory of prior answers and asks again.

**How to verify:**
```sql
SELECT id, conversation_summary, updated_at 
FROM wills 
WHERE status = 'in_progress' 
ORDER BY updated_at DESC 
LIMIT 20;
```

If I see wills where `conversation_summary` is null or hasn't updated despite recent messages — that's the bug.

**Why it would also explain slowness:**
Without a summary, the system might fall back to loading more message history, or the AI is doing more work to reconstruct context from nothing, or we're accidentally sending the full message array to the API (which grows with conversation length).

## Hypothesis 2: Token limit exhaustion

If conversations are long (30+ exchanges) and our "last 4 messages" window accidentally became "all messages" due to a code regression or missing `.slice(-4)`, we'd be sending thousands of tokens per request. This would:
- Slow responses (more tokens = more time)
- Potentially hit context window limits, causing the AI to truncate or lose early information

**How to verify:**
- Log the actual token count we're sending per request (check OpenAI response headers: `usage.prompt_tokens`)
- If recent requests show 5000+ prompt tokens when we expect ~1500, we have a context size regression

## Hypothesis 3: Database connection exhaustion

Each chat message triggers:
1. Load will + relations (1 query with JOINs)
2. Load recent messages (1 query)
3. Call OpenAI (network I/O)
4. Save extracted data (1-5 writes depending on what was extracted)
5. Update summary (1 more OpenAI call)
6. Update will's conversation_summary (1 write)

If requests pile up under load and the connection pool is exhausted, new requests queue up waiting for a connection — adding seconds of latency.

**How to verify:**
```sql
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
```
Check our TypeORM connection pool config. Default is usually 10 connections. Under 50 concurrent users doing chat, that's a bottleneck.

## Fix Plan (in order of likely impact)

### Immediate fix (< 30 min):
1. **Add error handling around summary update.** If `updateSummary()` fails, log the error but don't lose the previous summary. Fall back to appending raw facts to the existing summary.
2. **Verify the message slice.** Confirm we're only sending 4 recent messages, not the full history. Add a guard: `recentMessages.slice(-4)` with an explicit assertion.

### Short-term fix (same day):
3. **Increase connection pool size** from 10 to 25-30 connections. Add connection timeout logging.
4. **Add timeout to OpenAI calls** (8 second timeout). If it exceeds this, return a graceful "I'm thinking, please wait" message rather than hanging.
5. **Cache the will state** in memory (or Redis) for the duration of an active conversation, reducing repeated full-JOIN queries.

### Post-mortem action items:
6. **Add monitoring** for: tokens-per-request, summary-update-success-rate, and p95 latency per endpoint.
7. **Consider making the summary update async.** The user doesn't need to wait for the summary to be regenerated — we can do it in a background job and use the old summary for the next immediate message if needed.
8. **Add a circuit breaker** on the OpenAI calls. If the API is degraded, fail fast and queue messages for retry rather than making users wait 12+ seconds.

## Why this connects to our architecture

The "summary instead of full history" design (see DECISIONS.md #1) is specifically meant to prevent this class of problem. If it's working correctly, costs and latency should be constant regardless of conversation length. The fact that users are seeing forgetfulness AND slowness together strongly suggests the summary mechanism has a bug — either it's not updating, or it's being bypassed.

The separate `conversation_messages` table gives us full audit trail to verify: we can compare what the user actually said vs. what the summary contains, and pinpoint exactly where information was lost.
