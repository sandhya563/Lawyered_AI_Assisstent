# AI Will Maker

An AI-assisted will creation platform where users sign up, chat with an AI interviewer, and generate a properly structured legal will document.

## Tech Stack

- **Backend:** NestJS (TypeScript), TypeORM
- **Frontend:** Next.js 14 (App Router), TailwindCSS, Zustand
- **Database:** PostgreSQL 16
- **AI:** OpenAI GPT-4o-mini
- **PDF Generation:** PDFKit
- **Infrastructure:** Docker Compose

## Quick Start (Under 5 minutes)

### Prerequisites
- Docker & Docker Compose installed
- OpenAI API key

### Setup

```bash
# 1. Clone the repo
git clone <repo-url> && cd ai-will-maker

# 2. Copy environment file and add your OpenAI key
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# 3. Start everything
docker-compose up --build
```

That's it. The app is running at:
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:3001

### Demo Credentials
- **Email:** demo@willmaker.com
- **Password:** Demo@123

A completed sample will is pre-loaded for this user, so you can see the final result without going through the full interview.

---

## Running Without Docker

```bash
# 1. Start PostgreSQL locally (port 5432, user: postgres, password: postgres)

# 2. Create the database
createdb willmaker

# 3. Install dependencies
npm install

# 4. Setup environment
cp .env.example backend/.env

# 5. Seed the database
cd backend && npm run seed

# 6. Start backend
npm run start:dev

# 7. In another terminal, start frontend
cd frontend && npm run dev
```

---

## Project Structure

```
├── backend/                  # NestJS backend
│   └── src/
│       ├── auth/            # Part 1: Sign up & login (JWT + bcrypt)
│       ├── will/            # Part 2 & 4: Will CRUD + validation rules
│       ├── chat/            # Part 3: AI interview engine
│       ├── document/        # Part 5: PDF document generation
│       ├── entities/        # TypeORM entities
│       └── database/        # Schema (init.sql) & seed data
├── frontend/                 # Next.js frontend
│   └── src/
│       ├── app/             # Pages (login, signup, dashboard, will builder)
│       ├── components/      # WillPreview component
│       ├── lib/             # API client
│       └── store/           # Zustand auth store
├── DECISIONS.md             # Part 7: Architectural trade-offs
├── INCIDENT.md              # Part 7: Production incident response
├── docker-compose.yml       # One-command setup
└── .env.example             # Environment template
```

---

## Architecture Highlights

### AI Interview (Part 3 — core of the project)
- Uses **summary-based memory** instead of full history replay (see DECISIONS.md)
- Extracts structured data from natural language in a single API call
- Handles ambiguity by asking clarifying questions
- Handles changes of mind ("actually, make my brother the executor")
- Keeps token costs constant (~1500 tokens/request) regardless of conversation length

### Validation (Part 4)
- Three clear states: **Incomplete** / **Error** / **Warning**
- Runs on every message to update the live preview
- Blocks PDF generation until all errors are resolved

### Live Preview (Part 6)
- Real-time will document preview that updates after each chat message
- Shows completion percentage and validation issues
- Download button only activates when the will is finalizeable

---

## AI Tools Used

**Built with:** Claude (AI development environment using Claude)

**Where it helped:**
- Scaffolding the project structure and boilerplate
- Writing TypeORM entities from the SQL schema
- Generating the PDF layout code
- Drafting the system prompt for the AI interviewer

**One thing it got wrong:**
The AI initially suggested using `synchronize: true` in TypeORM config, which would auto-generate tables from entities. This is dangerous for production (it can drop columns on schema changes) and doesn't give you control over indexes and constraints. I caught this and used explicit SQL schema files instead, with `synchronize: false`.

---

## What's Implemented (Parts 1-7)

| Part | Status | Notes |
|------|--------|-------|
| 1. Sign up & Login | ✅ | JWT + bcrypt, clean token flow |
| 2. Database Design | ✅ | Normalized schema with proper constraints |
| 3. AI Interview | ✅ | Summary memory, structured extraction, clarification |
| 4. Validation Rules | ✅ | Three-state: incomplete/error/warning |
| 5. Will Document | ✅ | PDF generation with PDFKit |
| 6. Frontend | ✅ | Split-panel: chat + live preview |
| 7. Write-ups | ✅ | DECISIONS.md + INCIDENT.md |

### Part 8 (Bonus): Streaming responses
The optional streaming feature was not implemented to keep the main parts solid and well-tested.
