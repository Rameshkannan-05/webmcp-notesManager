# ProductManager

A full-stack product catalog dashboard with an AI assistant that can create, update, delete, and query products through natural language.

This project is designed to demonstrate practical, production-style engineering across frontend UX, backend API design, MongoDB modeling, and AI-tool integration.

## Why This Project Stands Out

- End-to-end full-stack ownership: React + Node/Express + MongoDB
- AI-assisted workflows: chatbot integrated with backend tool execution
- Real CRUD + validation + error handling, not mock data
- Deployment-ready structure with Vercel configs for frontend and backend
- Clean modular architecture with typed frontend domain models

## Features

- Product CRUD operations
  - Add, edit, delete, and list products
  - Form and server-side validation for robust input handling
- AI assistant for product operations
  - Chat endpoint with tool-based actions (`createProduct`, `updateProduct`, `deleteProduct`, `listProducts`, `getProduct`)
  - Fallback handling for missing/invalid fields
- Modern dashboard UI
  - Responsive React interface
  - Modal-based product editing
  - Toast notifications for async feedback
- API-first backend
  - REST endpoints under `/api/products`
  - Structured JSON responses and status codes

## Tech Stack

Frontend (`frontend/`)
- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Hot Toast

Backend (`backend/`)
- Node.js
- Express
- MongoDB + Mongoose
- dotenv

AI Integration
- Gemini model via backend `/api/chat` route
- Tool-calling flow handled server-side

## Project Structure

```text
productManager/
  backend/
    src/index.js
    vercel.json
  frontend/
    src/
    vercel.json
  package.json
  README.md
```

## Local Development

### 1. Install dependencies

From the repository root:

```bash
npm run install:all
```

### 2. Configure environment variables

Create these files manually:

- `backend/.env`
- `frontend/.env`

Recommended values:

Backend (`backend/.env`)

```env
PORT=4000
MONGODB_URI=<your_mongodb_connection_string>
GEMINI_API_KEY=<your_gemini_api_key>
GEMINI_MODEL=gemini-2.5-flash
```

Frontend (`frontend/.env`)

```env
REACT_APP_API_URL=http://localhost:4000
```

Notes:
- `REACT_APP_API_URL` can be either `http://localhost:4000` or `http://localhost:4000/api`.
- The frontend currently normalizes both formats.

### 3. Run the app

Run frontend and backend together:

```bash
npm run dev
```

Or separately:

```bash
npm run dev:frontend
npm run dev:backend
```

## API Summary

Base URL: `http://localhost:4000`

- `GET /api/health` - Health check
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get product by ID
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/chat` - AI chat endpoint with tool execution

## Deployment (Vercel)

This repository includes:

- `backend/vercel.json` for Node serverless deployment
- `frontend/vercel.json` with SPA rewrite rules to prevent React Router 404 on refresh

Typical approach:

1. Deploy `frontend/` as one Vercel project.
2. Deploy `backend/` as a second Vercel project.
3. Set frontend env `REACT_APP_API_URL` to the deployed backend URL.
4. Configure backend env vars in Vercel:
   - `PORT`
   - `MONGODB_URI`
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL`

## Engineering Highlights

- Structured validation strategy on both client and server
- Consistent API envelope patterns (`success`, `message`, `data`)
- Separation of concerns across service, tool, and UI layers
- Async UX improvements (loading, optimistic refresh patterns, toasts)

## Potential Improvements

- Add authentication and role-based access
- Add unit/integration tests (frontend + backend)
- Add CI workflow for lint/build/test checks
- Add request logging and centralized error middleware
- Add product image upload and pagination/search

## Author

If you are reviewing this for hiring, I am happy to walk through:

- architecture decisions,
- AI tool-calling flow,
- validation and error handling strategy,
- and deployment trade-offs.
