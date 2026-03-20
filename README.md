# ProductManager with WebMCP

A full-stack Product Management dashboard that combines standard CRUD workflows with an AI assistant capable of taking real actions (create, update, delete, list) through tool calls.

This repository is intentionally built as a portfolio-grade engineering project: clean architecture, production-style API design, environment-aware configuration, and AI integration that goes beyond simple chat responses.

## Why This Project Is Interesting

Most AI demos stop at text generation. This project demonstrates **actionable AI**:

- The assistant does not just "suggest" changes.
- It calls real tools and executes real product operations.
- Every operation goes through validation, API logic, and database persistence.

That is the core difference between a chatbot UI and a real AI-powered product workflow.

## What Is WebMCP?

**WebMCP** is a browser-side approach to using MCP-style tools (Model Context Protocol concepts) in web applications.

In simple terms:

- You register tools in your app (for example: `add_product`, `delete_product`, `list_products`).
- The model can call those tools with structured input.
- Your app executes the tool logic and returns structured results.

This creates a reliable bridge between natural language intent and deterministic system actions.

## Why Use WebMCP Here?

Without a tool protocol:
- AI responses are mostly unstructured text.
- Actions are brittle, regex-driven, or hidden in ad-hoc prompt logic.

With WebMCP-style tooling:
- Tool input schemas are explicit.
- Calls are observable and debuggable.
- Business operations remain predictable.
- You can safely expand capabilities over time.

In this project, that means users can type:

- "Add Portable Power Bank, price 29.99, stock 150"
- "Delete the product named X"
- "Show me all electronics under $50"

And those intents become controlled backend actions.

## System Architecture

```text
User (React UI)
  -> AI Chat Panel
    -> /api/chat (Express)
      -> Gemini tool-calling loop
        -> Product tools (create/update/delete/list/get)
          -> MongoDB (Mongoose)
  -> Product Dashboard
    -> /api/products REST endpoints
      -> MongoDB
```

## Core Features

- Product CRUD dashboard
  - Add, edit, delete, list products
  - Client + server validation
- AI assistant with real operations
  - Tool-based function execution
  - Context-aware follow-up prompts for missing fields
- Production-style API behavior
  - Consistent response envelope (`success`, `message`, `data`)
  - Proper status codes and error handling
- Deployment-ready setup
  - Vercel configs for frontend and backend
  - SPA rewrite to avoid React Router refresh 404s

## Tech Stack

Frontend (`productManager/frontend`)
- React 19 + TypeScript
- Vite
- Tailwind CSS
- `@mcp-b/react-webmcp`

Backend (`productManager/backend`)
- Node.js + Express
- MongoDB + Mongoose
- dotenv
- Gemini API integration

## Repository Structure

```text
.
+- productManager/
¦  +- frontend/
¦  +- backend/
¦  +- package.json
¦  +- .gitignore
+- README.md
```

## Getting Started

### 1) Install dependencies

From `productManager/`:

```bash
npm run install:all
```

### 2) Configure environment files

Backend: `productManager/backend/.env`

```env
PORT=4000
MONGODB_URI=<your_mongodb_uri>
GEMINI_API_KEY=<your_gemini_key>
GEMINI_MODEL=gemini-2.5-flash
```

Frontend: `productManager/frontend/.env`

```env
REACT_APP_API_URL=http://localhost:4000
```

### 3) Run locally

From `productManager/`:

```bash
npm run dev
```

Or run each service independently:

```bash
npm run dev:frontend
npm run dev:backend
```

## Key API Endpoints

- `GET /api/health`
- `GET /api/products`
- `POST /api/products`
- `GET /api/products/:id`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `POST /api/chat`

## How AI Tool Execution Works (High Level)

1. User sends natural-language request in chat.
2. Backend sends prompt + history + tool definitions to Gemini.
3. If Gemini returns a function call, backend executes the mapped product tool.
4. Tool result is fed back to Gemini as structured function response.
5. Gemini returns a final human-readable answer.
6. Frontend refreshes product state after successful chat operation.

This pattern gives you controlled automation instead of unpredictable free-form outputs.

## Deployment Notes (Vercel)

- Frontend has SPA rewrite config to route all paths to `index.html`.
- Backend has Node build/route config for serverless deployment.
- Deploy frontend and backend as separate Vercel projects, then set frontend `REACT_APP_API_URL` to backend URL.

## Recruiter-Focused Engineering Highlights

This project demonstrates:

- End-to-end system design (UI, API, DB, AI integration)
- Real-world handling of async state, failures, and validation
- Pragmatic AI architecture using tool protocols
- Deployment readiness and environment configuration discipline
- Product thinking: building useful AI workflows, not just model wrappers

## Roadmap

- Add authentication + role-based access control
- Add automated tests (unit + integration)
- Add CI pipeline for lint/build/test
- Add pagination, filtering, search, and analytics
- Add audit logs for AI-triggered operations

---

If you are evaluating this project for a role, I can walk through architecture decisions, trade-offs, and how I would productionize this further.
