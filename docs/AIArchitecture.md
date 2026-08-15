# AI Architecture

Q-Med employs two primary AI models:

## 1. Speech-to-Text: Faster Whisper
- **Model:** `base.en` (Optimized for speed and low memory footprint).
- **Execution:** Runs natively on the backend server.
- **Purpose:** Transcribes patient voice recordings into raw text.

## 2. Large Language Model: Groq (Llama3)
- **Model:** `llama3-70b-8192` via Groq Cloud API.
- **Purpose:** Parses the transcribed text to identify symptoms, determine the required medical department, and assess the urgency.
- **Output:** Structured JSON used directly by the React frontend to recommend a booking.
