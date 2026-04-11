# Grilled 🔥

**The prep partner that sees you, hears you, and knows the material.**

Grilled is a real-time AI interview and exam prep agent powered by Gemini 3.1 Flash Live API. It conducts voice-driven mock interviews and oral exams using your camera and microphone — watching your body language, detecting hesitation, and adapting questions in real time. When the session ends, it generates a structured gap report with AI-generated visual study aids and a voice debrief.

## Features

- **Two modes**: Interview Prep (mock interviews) and Exam Buddy (oral exam practice)
- **Natural language goal input**: Describe what you're preparing for in plain English
- **Real-time multimodal session**: Camera + mic with bidirectional audio via Gemini Live API
- **Adaptive behaviour**: Interrupts when you're wrong, encourages when you hesitate, escalates when you're strong
- **Agentic resource search**: Upload PDFs or let Gemini find materials via web grounding
- **Gap report**: Three-tier breakdown (strong / needs review / priority) with readiness score
- **Visual cram cards**: AI-generated study aid diagrams for your weakest topics (Gemini image generation)

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Core engine**: [Gemini Live API](https://ai.google.dev/gemini-api/docs/live) — real-time bidirectional audio + video frames via WebSocket
- **Web grounding**: Gemini built-in agentic search
- **Visual study aids**: Gemini image generation — study diagrams from gap report topics
- **Gap report**: Gemini structured output — three-tier analysis with readiness score
- **PDF parsing**: PDF.js (client-side)
- **Media capture**: Browser MediaDevices API

No backend. No database. No auth. Everything runs client-side.

## Setup

```bash
git clone https://github.com/your-username/grilled.git
cd grilled
npm install
```

Create a `.env` file:

```bash
cp .env.example .env
```

Add your API key:

```
VITE_GEMINI_API_KEY=your_gemini_api_key
```

Run the dev server:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser. Grant camera and microphone permissions when prompted.

## Architecture

```
src/
├── App.tsx                     # Router: landing → goal → resources → session → report
├── components/
│   ├── ModeSelect.tsx          # Interview Prep / Exam Buddy toggle
│   ├── GoalInput.tsx           # Natural language goal input
│   ├── ResourceUpload.tsx      # PDF upload + auto-search option
│   ├── ResourceConfirm.tsx     # Gemini confirms context before session
│   ├── Session.tsx             # Live session (camera, waveform, timer, end button)
│   └── GapReport.tsx           # Three-tier report + Gemini-generated visuals
├── hooks/
│   ├── useMediaDevices.ts      # Camera + mic access, video frame capture
│   ├── useGeminiSession.ts     # Live API session lifecycle + audio playback
│   ├── useAudioStreamer.ts     # Mic audio → base64 PCM chunks
│   └── useGapReport.ts        # Post-session gap report generation
├── lib/
│   ├── gemini.ts              # Gemini Live API WebSocket + standard completion
│   ├── gemini.ts              # Gemini Live API + completions + image gen
│   ├── pdf.ts                 # PDF.js text extraction
│   └── prompts.ts             # System instructions for interview/exam personas
└── types/
    └── index.ts               # TypeScript types
```

## How It Works

1. **Choose mode** — Interview Prep or Exam Buddy
2. **Describe your goal** — "Google L4 Frontend interview tomorrow"
3. **Add materials** — Upload PDFs or let Gemini search for you
4. **Live session** — Gemini asks questions via voice while watching your camera feed
5. **Gap report** — Structured breakdown of strengths and weaknesses
6. **Visual cram cards** — Gemini generates study aid diagrams for weak topics

## Hackathon

Built at **{Tech: Europe} London AI Hackathon** (April 2026) for the **Google DeepMind — Real-Time Conversational Agents with Gemini 3** track.

### Partner Technologies
- **Google DeepMind** — Gemini Live API (real-time multimodal), Gemini Flash (gap report), Gemini image generation (visual cram cards)

## Credits

- [Gemini API](https://ai.google.dev) by Google DeepMind
