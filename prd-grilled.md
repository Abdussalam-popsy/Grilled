# PRD: Grilled — Real-Time AI Interview & Exam Prep Agent

**Team Size:** 2  
**Hackathon:** {Tech: Europe} London AI Hackathon — April 2026  
**Track:** Google DeepMind — Real-Time Conversational Agents with Gemini 3  
**Side Challenges:** Best Use of fal, Gradium integration  
**Submission Deadline:** 17:30  
**Deliverables:** 2-min Loom demo + public GitHub repo with README

---

## 1. Problem Statement

High-stakes preparation — interviews, exams — is fundamentally a performance problem, not a knowledge problem. You can read every slide and still freeze when asked to explain it out loud. You can memorise STAR answers and still stumble when the interviewer pushes back.

The problem is that nobody is watching you while you answer. No tool today holds vision, audio, and domain knowledge simultaneously to simulate a real evaluator who sees your hesitation, hears your uncertainty, and knows the material well enough to catch your gaps before your interviewer or examiner does.

Existing solutions are either passive (flashcard apps, quiz generators) or asynchronous (recorded mock interviews with delayed feedback). None of them operate in real time, adapt to your emotional state, or autonomously gather context about your specific company or subject.

---

## 2. Target User

**Primary:** University students (18–28) preparing for exams or technical interviews within the next 24–72 hours. They have materials but no one to pressure-test them at 2am.

**Secondary:** Career switchers and job candidates preparing for interviews at specific companies. They need a simulated interviewer who knows the company, not generic question banks.

---

## 3. Product Vision

Grilled is the prep partner that sees you, hears you, and knows the material — all at once. Powered by Gemini 3.1 Flash Live API, it conducts real-time voice-driven interview or exam sessions where it asks questions, watches your body language through the camera, detects hesitation before you finish speaking, and goes out and fetches its own context if you don't provide any. When the session ends, it doesn't just tell you what you got wrong — it generates visual study aids for your weakest areas so you can cram smarter in the time you have left. It's not a quiz app. It's the smartest, most perceptive study partner you've ever had.

---

## 4. Core Features (Scoped for 2 People, 1 Day)

### 4.1 Mode Selection

Two modes: **Interview Prep** and **Exam Buddy**. Single toggle at session start. Determines Gemini's persona, question style, and evaluation criteria. No settings page, no accounts, no config.

### 4.2 Goal Input via Natural Language

User describes their goal conversationally: "I have a Google L4 frontend interview tomorrow" or "Biochemistry module exam on protein synthesis in 6 hours." Gemini parses intent, extracts company/role or subject/topic, and confirms understanding before proceeding.

### 4.3 Resource Ingestion + Agentic Search

User can upload PDFs, images of slides, or paste text/URLs. If nothing is provided, Gemini uses **web grounding** to autonomously search — fetching the job description, company engineering blog, past exam papers, or syllabus content. Gemini confirms what it found before starting: "I found the JD for Google L4 Frontend Engineer and two posts from their engineering blog. Ready to start?"

### 4.4 Real-Time Multimodal Session (Gemini Live API)

Gemini asks questions via voice using the Live API's bidirectional audio stream. While the user responds, Gemini processes camera frames and audio simultaneously, evaluating three dimensions:

- **Correctness** — Is the answer factually right against the ingested resources?
- **Confidence** — Eye contact, speech clarity, visible hesitation (via camera)
- **Depth** — Surface-level recall vs. genuine understanding

### 4.5 Adaptive Interruption & Encouragement

- Wrong or vague → Gemini interrupts: "Let me stop you — you're conflating X with Y."
- Hesitating or stressed → Gemini pauses: "Take a breath. No rush."
- Performing well → Gemini escalates: "Good. Now explain why that breaks at scale."

### 4.6 Gap Report with AI-Generated Visual Study Aids (fal)

When the session ends, Grilled generates a structured gap report with:

- Topics with strong performance (confident + correct)
- Topics with hesitation (correct but shaky — review recommended)
- Topics answered incorrectly (priority review with explanations)
- Overall readiness score (1–10) with justification
- **Visual cram cards** — for the user's weakest 3–5 topics, fal generates illustrated study aid images: diagrams, concept maps, or visual mnemonics tailored to the specific gaps identified. These are not generic — they're generated from the specific mistakes the user made.

This is Grilled's fal integration and the entry point for the **Best Use of fal** side challenge. The generated visuals turn the gap report from a text list into a visual cram kit the user can screenshot and review on their phone.

### 4.7 Gradium Voice Integration

Gradium's real-time TTS and STT models are used as the voice layer for the gap report debrief. After the live Gemini session ends, the gap report is read back to the user via Gradium's TTS — a calm, clear voice walking through their strengths and weaknesses like a coach giving post-game feedback. This creates a natural two-phase experience: Gemini is the interviewer/professor (intense, adaptive, multimodal), and the Gradium-voiced debrief is the supportive coach (structured, clear, actionable).

This also serves as a fallback voice pipeline if Gemini Live API audio has latency or quality issues during the demo.

---

## 5. User Flow

**Step 1 — Landing.** Clean single-screen UI. Product name "Grilled" prominent. Two buttons: "Interview Prep" / "Exam Buddy." No sign-up, no auth.

**Step 2 — Goal description.** Text input with mic option. User types or speaks their goal. Example: "Product design interview at Figma next Tuesday."

**Step 3 — Resource upload or auto-search.** Drag-and-drop zone for files. Button: "Or let me find resources for you" — triggers Gemini web grounding. Loading state shows what's being fetched.

**Step 4 — Context confirmation.** Gemini summarises what it knows. User confirms or adds more. "Let's go" button starts the session.

**Step 5 — Live session.** Camera + mic activate. Gemini greets the user in character. Minimal UI: camera preview, live waveform, timer. 8–15 questions over 10–20 minutes, adapting in real time.

**Step 6 — End session.** User clicks "End Session" or Gemini concludes naturally. Brief loading state.

**Step 7 — Gap report + visual cram cards.** Full-screen report with three-tier breakdown. Gradium TTS reads through the key findings. fal-generated visual study aids appear inline for the weakest topics. User can screenshot or download.

---

## 6. Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)              │
│                                                          │
│  ┌──────────┐  ┌───────────┐  ┌───────────┐  ┌────────┐ │
│  │  Mode    │  │ Resource  │  │ Session   │  │ Gap    │  │
│  │  Select  │  │ Upload    │  │ (cam+mic) │  │ Report │  │
│  └──────────┘  └───────────┘  └─────┬─────┘  └───┬────┘ │
│                                     │             │      │
└─────────────────────────────────────┼─────────────┼──────┘
                                      │             │
              WebSocket (bidi audio   │             │
              + video frames)         │             │
                                      ▼             │
┌─────────────────────────────────────────┐         │
│      Gemini 3.1 Flash Live API          │         │
│                                         │         │
│  • Audio + video frame input            │         │
│  • Audio + text output                  │         │
│  • System instruction sets persona      │         │
│  • Web grounding for agentic search     │         │
│  • Session context holds resources      │         │
└─────────────────────────────────────────┘         │
                                                    │
                    ┌───────────────────────────────┘
                    │
                    ▼
        ┌───────────────────┐     ┌──────────────────┐
        │    Gradium API    │     │     fal API       │
        │                   │     │                   │
        │  TTS: reads back  │     │  Generates visual │
        │  gap report as    │     │  study aids from   │
        │  coach debrief    │     │  gap report topics │
        └───────────────────┘     └──────────────────┘
```

**Key decisions for a team of 2:**

- **No backend.** Frontend connects directly to all APIs. API keys client-side for hackathon (not production-safe, acknowledged).
- **Camera frames** sent as periodic snapshots (1–2 fps) via Live API video input.
- **Audio** streamed bidirectionally through Live API's native audio mode during session.
- **Resources** converted to text client-side (PDF.js) and injected into Gemini session context.
- **Web grounding** is built into Gemini — no custom search infra.
- **fal** called post-session with structured prompts derived from gap report topics. Model: likely fal's fastest image generation endpoint for speed during demo.
- **Gradium** called post-session for TTS readback of gap report summary.
- **Gap report** generated as structured Gemini text completion after Live session ends.

**Stack:**

- React + Vite (frontend)
- Gemini 3.1 Flash Live API (real-time multimodal — DeepMind track requirement)
- Gemini web grounding (agentic resource search)
- Gradium TTS/STT (voice debrief)
- fal (visual study aid generation)
- Browser MediaDevices API (camera + mic)
- PDF.js (client-side PDF parsing)
- No database, no auth, no backend

**Partner tech compliance:**

- ✅ Google DeepMind (Gemini 3.1 Flash Live API) — primary, satisfies track + min 1 partner tech
- ✅ fal — visual cram card generation, enters Best Use of fal side challenge ($1k credits)
- ✅ Gradium — TTS voice debrief layer

---

## 7. Work Split (2 People)

**Person A — Session Engine:**

- Gemini Live API integration (WebSocket, audio/video streaming)
- Camera + mic browser setup
- System prompt engineering (interview + exam personas)
- Agentic resource fetching via web grounding
- Live session UI (waveform, camera preview, timer)

**Person B — Report Engine + Frontend:**

- Landing page, mode selection, goal input, resource upload UI
- Gap report generation (structured Gemini completion)
- fal integration (visual study aid generation from gap topics)
- Gradium TTS integration (voice debrief readback)
- Gap report display UI (three-tier breakdown + inline images)

**Both:** Demo video recording, README, GitHub repo cleanup.

---

## 8. Demo Script (2 Minutes — Loom Recording)

**[0:00–0:10] Hook.**
"It's 11pm. Your interview is tomorrow. You've read everything. But you have no idea if you're actually ready. Grilled does."

**[0:10–0:20] Mode + goal.**
Click "Interview Prep." Type: "Google L4 Frontend Engineer interview tomorrow." Enter.

**[0:20–0:35] Gemini fetches context.**
Gemini searches autonomously. Confirms: "I found the JD on Google Careers and two Chrome engineering blog posts. Ready when you are."

**[0:35–1:15] Live session.**
Camera + mic go live. Gemini (voice): "Let's start. Walk me through how you'd design a real-time collaborative text editor."

Presenter gives a vague answer about CRDTs. Gemini interrupts: "Hold on — you're describing OT, not CRDTs. Here's the distinction..."

Presenter hesitates on next question. Gemini: "I can see you're thinking. Take a moment."

**[1:15–1:35] Gap report.**
Click "End Session." Report appears: strong areas, shaky areas, weak areas. Readiness score: 6/10.

**[1:35–1:50] Visual cram cards + voice debrief.**
fal-generated visual study aids appear for the weak topics — a diagram of CRDT vs OT, a visual of the browser rendering pipeline. Gradium voice reads: "Your system design fundamentals are solid, but you need to review conflict resolution strategies before tomorrow."

**[1:50–2:00] Close.**
"Grilled sees you, hears you, and knows the material. It catches what you don't know — before your interviewer does."

---

## 9. Hackathon Judging Alignment

**DeepMind Track Criteria:**

- ✅ Uses Gemini 3.1 Flash Live API as primary engine
- ✅ Real-time multimodal — voice, vision, and reasoning simultaneously (not just text chat)
- ✅ Demonstrates tonal understanding (detecting hesitation, stress)
- ✅ Demonstrates long-horizon reasoning (adaptive question sequencing across full session)
- ✅ Autonomous real-time agent (web grounding, interruption, pacing)

**Finalist Stage Criteria (creativity, technical complexity, partner tech):**

- ✅ Creative: novel application of Live API — not another chatbot or transcription tool
- ✅ Technical complexity: three APIs integrated (Gemini + fal + Gradium), real-time bidirectional audio/video, agentic search
- ✅ Partner tech: all three partners used meaningfully

**Best Use of fal Side Challenge:**

- ✅ fal generates personalised visual study aids from session-specific gaps — not generic stock images but contextual, educational visuals tied to what the user got wrong

---

## 10. Success Metrics

**At the hackathon:**

- The live demo produces an audible "wow" when Gemini interrupts the presenter mid-answer
- The full loop works end-to-end without breaking: mode → goal → search → session → report → visuals → voice
- Judges see three partner techs working together, not bolted on
- The gap report with fal visuals feels like a real product, not a hackathon prototype

**If this were a real product:**

- Average session length > 10 minutes
- > 70% of users complete a full session to gap report
- Gap report actionability rating > 4/5
- Visual cram cards shared/screenshotted > 50% of sessions

---

## 11. Out of Scope (v1)

- User accounts, login, session history
- Video/audio recording and playback of session
- Distraction detection (tab switching, phone checking)
- Progress tracking over time
- Mobile-native app (browser-only)
- Multi-language support (English only)
- Group/collaborative prep sessions
- Custom persona or difficulty tuning
- Whiteboard/code editor for technical interviews (voice + camera only for v1)

---

## Appendix: Prompt Engineering Notes

**Interview Mode System Instruction:**

> You are a senior hiring manager conducting a live mock interview. You are sharp, fair, and thorough. You ask follow-up questions when answers are vague. You notice when the candidate hesitates, breaks eye contact, or looks uncertain via the camera feed. You tailor questions to the specific role and company based on the resources you've been given. You do not accept surface-level answers. When the candidate is wrong, you correct them concisely and move on. When they're struggling, you acknowledge it and give them space. Your goal is to surface gaps, not to trick them. You speak naturally and conversationally — not like a robot reading questions from a list.

**Exam Mode System Instruction:**

> You are a university professor conducting an oral examination. You are strict but supportive. You ask questions that test understanding, not memorisation. You go deeper when the student answers well. You re-explain concepts when the student is confused. You notice hesitation and visible stress through the camera feed and adjust your pace accordingly. You cover the material systematically and flag topics the student needs to review. You speak like a real professor — direct, knowledgeable, occasionally encouraging.

**Gap Report Structured Output Prompt:**

> Generate a JSON gap report with: (1) "strong" — array of topics answered correctly with confidence, each with a one-line justification. (2) "shaky" — array of topics answered correctly but with visible hesitation or incomplete depth, each with what was missing. (3) "weak" — array of topics answered incorrectly or incompletely, each with the correct answer and a recommended review angle. (4) "readiness_score" — integer 1–10 with a one-sentence justification. (5) "top_cram_topics" — the 3–5 most important things to study in the remaining time, each with a one-line visual description suitable as a prompt for an image generation model to create a study aid diagram.

**fal Visual Prompt Template:**

> "Clean, minimal educational diagram explaining [topic]. Style: textbook illustration, white background, labelled clearly. Concept: [specific gap from session]. No text longer than 5 words per label."
