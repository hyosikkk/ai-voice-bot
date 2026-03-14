# AI Dubbing Service

A web service that automatically dubs audio/video files into different languages using AI.

**🚀 Demo**: https://ai-voice-bot-rose.vercel.app

[한국어](./README.md) | **English** | [日本語](./README.ja.md) | [Español](./README.es.md)

---

## Features

- **Automatic Dubbing Pipeline**: Speech Recognition (STT) → Translation → Speech Synthesis (TTS), fully automated
- **Multilingual Support**: Mutual dubbing between Korean, English, Japanese, and Spanish
- **Various File Formats**: Supports audio/video files (MP3, WAV, MP4, WebM, etc.) up to 100MB
- **Side-by-Side Video Comparison**: When a video is uploaded, original and dubbed videos play simultaneously for easy comparison
- **Dubbed Video Download**: Merges original video + dubbed audio into an MP4 file using ffmpeg.wasm in the browser
- **Auto Sync Adjustment**: Automatically calculates and adjusts dubbed audio playbackRate to match the original video length
- **Google Login**: Google OAuth authentication with whitelist-based access control
- **Drag & Drop**: Supports drag-and-drop file upload
- **Step-by-Step Progress**: Real-time animation for each processing step (Upload → STT → Translation → TTS)

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | NextAuth.js v4 + Google OAuth |
| Database | Turso (libSQL) — Whitelist management |
| File Storage | Vercel Blob |
| Speech Recognition (STT) | ElevenLabs Scribe v1 |
| Translation | Google Cloud Translation API v2 |
| Speech Synthesis (TTS) | ElevenLabs Multilingual v2 |
| Video Processing | ffmpeg.wasm (browser-side) |
| Deployment | Vercel |

---

## How It Works

```
Upload file (audio/video)
        ↓
ElevenLabs Scribe v1 — Speech Recognition (STT)
        ↓
Google Cloud Translation API — Translation
        ↓
ElevenLabs Multilingual v2 — Dubbing (TTS)
        ↓
Output
  ├── Audio: MP3 playback & download
  └── Video: Side-by-side comparison + MP4 download
```

---

## Local Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/hyosikkk/ai-voice-bot.git
cd ai-voice-bot
npm install
```

### 2. Set up environment variables

Create a `.env.local` file and fill in the following:

```env
# ElevenLabs (https://elevenlabs.io)
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=        # Your Voice ID from My Voices

# Google Translate (https://console.cloud.google.com)
GOOGLE_TRANSLATE_API_KEY=   # Enable Cloud Translation API, 500,000 chars/month free

# Turso DB (https://turso.tech)
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=

# Google OAuth (https://console.cloud.google.com)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# NextAuth
NEXTAUTH_SECRET=            # Generate with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Vercel Blob (https://vercel.com/dashboard → Storage)
BLOB_READ_WRITE_TOKEN=
```

### 3. Register whitelist

Add allowed emails to the `INITIAL_WHITELIST` array in `lib/db.ts`. They will be auto-registered on first server start.

### 4. Run development server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

> Only Google accounts registered in the whitelist can log in.

---

## Live Demo

**https://ai-voice-bot-rose.vercel.app**

> Login with a Google account. Only whitelisted users can access the service.

---

## Future Improvements

| Feature | Description |
|---------|-------------|
| **Lip Sync** | AI-powered mouth movement regeneration to match dubbed audio (Wav2Lip, HeyGen, etc.) |
| **Background Music / Voice Separation** | Separate speaker voice from background music, dub only the voice while keeping original music |
| **Multi-Speaker Dubbing** | Detect and distinguish multiple speakers, assign different voices to each |
| **Voice Cloning** | Preserve the original speaker's tone and emotion in the dubbed voice |
| **Subtitle Sync** | Embed timestamp-based subtitles from STT/translation results into the video |
| **Fine-Grained Sync Adjustment** | Sync adjustment per utterance segment (currently uses overall duration ratio) |
| **More Languages** | Add support for French, German, Chinese, Arabic, etc. |

---

## Built with Claude Code (AI Coding Agent)

This project was developed using **Claude Code** (Anthropic's AI coding agent).

### Tasks handled by the agent

- **Architecture design**: Next.js App Router structure and dubbing pipeline architecture
- **API integrations**: ElevenLabs STT/TTS, Google Translate, NextAuth, Turso DB
- **UI development**: Dark glassmorphism design, sound wave animation, side-by-side video comparison player
- **Video processing**: Browser-side video + audio merging with ffmpeg.wasm
- **Sync logic**: Automatic playbackRate calculation and adjustment
- **Debugging**: Immediate root cause analysis and fixes from error logs
- **Deployment**: Vercel setup, GitHub auto-deploy configuration

### Tips for using AI coding agents

1. **Paste error logs directly** — actual error messages lead to faster solutions than long explanations
2. **Be specific** — `"make an /api/dub POST route that receives files via FormData"` beats `"make an API"`
3. **One feature at a time** — requesting multiple features simultaneously can cause conflicts
4. **Always review the code** — especially auth and security-related code
5. **Protect sensitive info** — never paste `.env.local` contents into the chat
