# Founder Voice: The War Room

**"The AI pitch partner that grills you, doubts you, and tells you exactly why you're not fundable—before a real investor does."**

![Founder Voice Banner](/public/opengraph-image.png)

## 📌 Problem Statement
Founders often practice in "safe" environments—pitching to mirrors or supportive friends. But real VCs interrupt, fact-check, and challenge logic in real-time. This **Pressure Gap** leads to founders freezing up during actual high-stakes meetings.

**Founder Voice** is a "Flight Simulator for Fundraising." It replaces the passive practice with an **adversarial AI agent** that simulates a ruthless VC meeting.

## 🚀 Key Features

### 🎙️ The War Room (Real-time Pitch Simulation)
- **Active Interruption Engine:** The AI doesn't just listen; it barges in if you ramble, just like a real investor.
- **Latency-Free Voice:** Powered by **Deepgram Nova-2** for sub-300ms response times.
- **Visual Feedback:** A real-time waveform visualizer that reacts to speech states.

### 🧠 Context-Aware Intelligence
- **Deck Analysis:** Upload your PDF pitch deck. The AI reads it instantly and finds contradictions between what you say and what you wrote.
- **Live Fact-Checking:** Powered by **Tavily**, the AI browses the live web to verify your market sizing and competitor claims on the fly.
- **VC Persona:** Simulates an "Aggressive VC" profile—skeptical, impatient, and data-driven.

### 📊 Fundability Report Card
After every session, you receive a detailed score (0-100) on:
- **Market Clarity** (TAM/SAM/SOM quality)
- **Tech Defensibility** (IP vs. Wrapper)
- **Unit Economics** (LTV/CAC logic)
- **Investor Readiness** (Communication under pressure)

## 🛠️ Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS, Framer Motion
- **Backend:** Next.js Server Actions, Edge API Routes
- **Database:** Supabase (PostgreSQL + pgvector)
- **Auth:** Supabase Auth (Google OAuth)
- **AI Infrastructure:**
  - **Logic:** OpenAI `gpt-4o-mini` (Conversation), `gpt-4o` (Report Generation)
  - **Speech-to-Text:** Deepgram `nova-2`
  - **Text-to-Speech:** Deepgram `aura-orion-en`
  - **Tools:** Tavily Search API

## ⚡ Getting Started

### Prerequisites
- Node.js 18+
- npm / yarn / pnpm
- Accounts with: OpenAI, Deepgram, Tavily, Supabase

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sandeshanvekarNIAT/founder-voice.git
   cd founder-voice
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Rename `.env.local.template` to `.env.local` and fill in the required keys:

   ```env
   # OpenAI (Logic & Reasoning)
   OPENAI_API_KEY=sk-...

   # Deepgram (Voice Infrastructure)
   DEEPGRAM_API_KEY=...

   # Tavily (Live Web Search)
   TAVILY_API_KEY=tvly-...

   # Supabase (Database & Auth)
   NEXT_PUBLIC_SUPABASE_URL=https://...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

4. **Initialize Database:**
   Run the SQL commands in `schema.sql` in your Supabase SQL Editor to set up the `profiles`, `pitch_decks`, and `sessions` tables.

5. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Architecture

The system uses a **Hybrid Real-time Architecture**:
1. **WebSockets (Deepgram):** Establishes a persistent bi-directional audio stream for low-latency communication.
2. **Orchestration Layer:** Manages conversation state and decides when to trigger the LLM or interrupt the user.
3. **Async Analysis:** Post-session, the transcript is processed by `gpt-4o` to generate the detailed Fundability Report.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
