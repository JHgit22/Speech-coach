# Speech Coach (VoxCoach)

Practice impromptu speaking: get a random topic, record yourself, and receive instant AI-graded feedback on delivery, pacing, and filler words.

## Stack
- **Client:** React + TypeScript + Vite + Tailwind CSS v4
- **Server:** Node.js + TypeScript + Express
- **AI:** Google Gemini (`gemini-3.8-flash`) — transcribes and grades in a single structured-output call
- **PDF export:** client-side via jsPDF

Nothing is persisted server-side — audio is processed in memory per request and discarded after the response is sent.

## Local setup

1. **Server**
```bash
   cd server
   npm install
   cp .env.example .env   # then paste your Gemini API key into .env
   npm run dev
```
   Runs on http://localhost:3001

2. **Client** (new terminal)
```bash
   cd client
   npm install
   npm run dev
```
   Runs on http://localhost:5173

## Live app
- Backend: `<YOUR_RENDER_URL>`
- Frontend: `<YOUR_VERCEL_OR_NETLIFY_URL>`