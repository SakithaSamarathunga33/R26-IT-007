# LexiScan — Dyslexia Early Screening AI

An AI-powered mobile application for early dyslexia screening in children aged ~5–7, combining three assessment modalities with a multi-modal fusion engine and a practice-plan cycle.

Designed for pre-readers: every question is read aloud, activities are grouped into unlockable levels, and results are shown with colour and icons rather than text alone.

---

## Contents

- [How the app works](#how-the-app-works)
- [Screening modules](#screening-modules)
- [Levels](#levels)
- [Text-to-speech](#text-to-speech)
- [Fusion analysis](#fusion-analysis)
- [Therapy cycle](#therapy-cycle)
- [Project structure](#project-structure)
- [Tech stack](#tech-stack)
- [Setup](#setup)
- [API endpoints](#api-endpoints)
- [Firestore](#firestore)
- [Model training](#model-training)

---

## How the app works

The app runs a repeating **screen → practise → re-screen** cycle:

```
Sign up / Log in
      ↓
┌─────────────────────────────────────────────┐
│  Complete 3 modules (all levels in each)    │
│    Speech · Writing · Behaviour             │
└─────────────────────┬───────────────────────┘
                      ↓
              Run Final Analysis
                      ↓
        Report  →  saved to History
                      ↓
        Practice Plan unlocked
        🔒 modules lock while it runs
                      ↓
        Complete the practice sessions
        (or end the plan early)
                      ↓
        Modules unlock  →  screen again
                      ↓
                    ↺ repeat
```

Each module must be finished **in full** — every level — before the final analysis is allowed to run. This prevents a risk score being computed from partial data.

### Screen flow

```
Welcome → Onboarding → Login / Signup
  └─ MainTabs (Home · History · Profile)
       ├─ Speech:      Intro → Levels → Activity → Listen → Recording
       │                     → Review → Result → Level Complete → Summary
       ├─ Writing:     Intro → Levels → Task → Canvas → Review
       │                     → Result → Level Complete → Summary
       ├─ Behaviour:   Intro → Levels → Activity → Result
       │                     → Level Complete → Summary
       └─ Fusion:      Progress → Loading → Risk Summary → Difficulty
                             → Therapy → Report
```

---

## Screening modules

| Module | Activities | What it measures | Input |
|---|---|---|---|
| **Speech & Phonological** | 10 | Phoneme accuracy, rhyme, syllable segmentation, phonological memory | Microphone (WAV) |
| **Handwriting** | 21 | Letter formation, b/d/p/q reversals, spacing, alignment | Canvas drawing or photo |
| **Behavioural & Attention** | 22 | Attention, working memory, letter–sound mapping, pattern recognition | Multiple choice taps |

### Behaviour task types

`letter_identification` · `missing_letter` · `shape_matching` · `pattern_completion` · `attention_sustained` · `working_memory`

**Missing-letter** activities show a word with a gap and four letter tiles — e.g. `_ m b r e l l a` → **u**. Nine of these run across the three levels, progressing from `cat` and `sun` to `butterfly` and `school`, with b/d/p/q traps at Level 3.

---

## Levels

Every module splits its activities into **3 locked levels**. Level 1 is always open; each later level unlocks when the one before it is completed.

| Level | Speech (10) | Writing (21) | Behaviour (22) |
|---|---|---|---|
| **1** | Simple Sounds — 4 | Letters — 7 | Getting Started — 7 |
| **2** | Getting Harder — 3 | Letters & Words — 7 | Looking Closer — 8 |
| **3** | Challenge — 3 | Advanced Writing — 7 | Challenge — 7 |

Progress is stored **per child, not per session**, so a completed level stays unlocked across logins and re-runs. Unlocks reset only when a new screening round begins.

---

## Text-to-speech

The app reads content aloud so a child who cannot yet read is never blocked.

| Where | Spoken |
|---|---|
| Speech · Listen screen | The target word, auto-played on arrival — *"Say the word: cat"* |
| Speech · Recording | "Hear it again" replay |
| Writing · Dictation | The word, **never shown on screen** — it is a listening task |
| Writing · Canvas | "Hear again" while writing |
| Writing · Memory tasks | "Hear the word" |
| Behaviour · every question | Auto-read on arrival, plus **Again** / **Slowly** |
| Behaviour · answer tapped | The chosen option is read back |
| All modules · activity done | *"Done!"* |
| All modules · level done | *"Level complete! Level 2 unlocked."* |

**Slowly** stretches a word letter-by-letter (`c - a - t`). The app's voice is always stopped before the microphone opens so it can never bleed into a recording.

Behaviour replays are counted and fed to the model as `prompt_replay_count` — repeatedly needing the question re-read is a genuine attention signal.

---

## Fusion analysis

Runs only when all three modules are complete. One API call returns the risk score, the primary difficulty, and the therapy plan together.

```
overall_risk_score = 0.40 × speech + 0.35 × handwriting + 0.25 × behaviour

score < 0.35            →  low
0.35 ≤ score < 0.70     →  medium
score ≥ 0.70            →  high

binary at-risk label: score ≥ 0.35
```

The **primary difficulty** (`phonological_processing` / `handwriting` / `attention_behavior`) comes from an XGBoost model, falling back to the highest-scoring module if the model is unavailable. The response reports which method was used.

### Response shape

```jsonc
{
  "final_prediction":        { "overall_risk_score", "final_dyslexia_risk_level", "weights", ... },
  "primary_difficulty":      { "primary_difficulty_label", "confidence", "method" },
  "secondary_difficulty_label": "handwriting",
  "therapy_recommendation":  { "primary_focus", "recommended_activities", ... },
  "quality":                 { "fusion_reliability", "warnings" },
  "fusion_features":         { "speech_score", "handwriting_score", "behavior_score", ... },
  "database_save_payload":   { /* pre-shaped Firestore documents */ }
}
```

The full response is stored in `assessment_history.fullReport`, so any past report — including its therapy plan — can be reopened from the History tab.

---

## Therapy cycle

The fusion API returns a rule-based plan derived from two values:

- **Primary difficulty** → picks 3 activities from a fixed library
- **Risk level** → sets sessions per week (high 3 · medium 2 · low 1)

Each backend activity id maps to real in-app tasks ([`therapyActivityMap.ts`](mobile/src/config/therapyActivityMap.ts)), so **Start Activity** launches the matching module activity in **practice mode**:

- No prediction is written to Firestore
- No level is unlocked
- The risk score is untouched

This isolation matters — without it, rehearsing would move the very score the plan was based on.

**While a plan is in progress the screening modules are locked.** They unlock when the plan is completed, or when the parent ends it early via *"End plan and start a new screening"*. Ending a plan clears its progress entirely for a fresh start.

Practice progress is tied to the report that produced it (by `assessment_history` document id), so a new analysis automatically starts a new plan at 0 — no reset step to forget.

---

## Project structure

```
Dyslexia-Early-Screening-AI/
├── backend/
│   ├── speech_phonological/      # FastAPI · port 8001
│   ├── behavioral_attention/     # FastAPI · port 8002
│   ├── handwriting_analysis/     # FastAPI · port 8003
│   └── multi_modal_risk/         # FastAPI · port 8004
│       └── api/app/services/
│           ├── fusion_service.py     # weighted fusion + difficulty model
│           └── therapy_service.py    # therapy activity library
├── mobile/                       # React Native / Expo app
│   └── src/
│       ├── config/
│       │   ├── apiConfig.ts          # backend URLs
│       │   ├── firebase.ts
│       │   ├── speechTasks.ts        # tasks + levels + TTS prompts
│       │   ├── handwritingTasks.ts
│       │   ├── behaviorTasks.ts
│       │   └── therapyActivityMap.ts # therapy id → in-app tasks
│       ├── navigation/AppNavigator.tsx
│       ├── screens/                  # 36 screens
│       ├── services/
│       │   ├── levelProgressService.ts    # shared level-unlock logic
│       │   ├── speechLevelService.ts      # per-module bindings
│       │   ├── handwritingLevelService.ts
│       │   ├── behaviorLevelService.ts
│       │   ├── therapySessionService.ts   # practice plan progress
│       │   ├── ttsService.ts              # text-to-speech
│       │   ├── kidFeedback.ts             # spoken encouragement
│       │   ├── fusionService.ts
│       │   ├── sessionService.ts
│       │   └── summaryService.ts
│       ├── utils/
│       │   ├── behaviorFeatures.ts   # raw events → ML features
│       │   └── practiceFlow.ts       # therapy practice stepping
│       └── theme/
├── firestore.rules
├── firebase.json  ·  .firebaserc
├── docker-compose.yml
└── README.md
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Mobile | React Native 0.81, Expo 54, TypeScript |
| Navigation | React Navigation 6 (native stack + bottom tabs) |
| Auth & Database | Firebase 11 (Auth + Firestore) |
| Text-to-speech | expo-speech |
| Audio | expo-audio |
| Canvas | react-native-svg, react-native-view-shot |
| Backend | Python 3, FastAPI, Uvicorn |
| ML | scikit-learn (Logistic Regression), XGBoost (fusion difficulty) |
| Deployment | Azure Container Apps · Docker Compose for local |

---

## Setup

### Prerequisites

- Node.js 18+ and npm
- Docker Desktop (only for running the backends locally)
- Expo Go on a phone, or an emulator
- Firebase CLI (`npm i -g firebase-tools`) for deploying rules

### Mobile

```bash
cd mobile
npm install
npm start        # Expo dev server
npm run android  # Android emulator / device
npm run ios      # iOS simulator (macOS only)
```

By default the app calls the **deployed Azure endpoints** in `mobile/src/config/apiConfig.ts` — no backend setup is needed to run it.

To point at local backends instead, edit that file:

```ts
const SPEECH_HOST = "http://192.168.x.x:8001";   // your machine's LAN IP
```

> Use the LAN IP, not `localhost` — a phone or emulator cannot reach your machine's loopback address.

### Backend (optional — for local development)

```bash
docker compose up --build          # all four services
docker compose up --build speech_api   # or one at a time
docker compose down
```

### Firestore rules

```bash
firebase login
firebase deploy --only firestore:rules
```

Required — level unlocks and therapy progress silently fail to save without the rules deployed.

---

## API endpoints

| Service | Port | Endpoint |
|---|---|---|
| Speech & Phonological | 8001 | `POST /predict/speech` |
| Behavioural & Attention | 8002 | `POST /predict/behavior` |
| Handwriting Analysis | 8003 | `POST /predict/handwriting` |
| Multi-Modal Fusion | 8004 | `POST /predict/fusion` |

Swagger UI at `http://localhost:<port>/docs`, health check at `/health`.

---

## Firestore

| Collection | Purpose |
|---|---|
| `users` | Child profile |
| `speech_attempts` · `speech_predictions` | Speech raw attempts and model output |
| `handwriting_attempts` · `handwriting_predictions` | Writing raw attempts and model output |
| `behavior_attempts` · `behavior_predictions` | Behaviour raw attempts and model output |
| `speech_level_progress` | Speech level unlocks (per child) |
| `handwriting_level_progress` | Writing level unlocks |
| `behavior_level_progress` | Behaviour level unlocks |
| `assessment_sessions` | Current screening session state |
| `assessment_history` | Every completed report, with full fusion response |
| `fusion_predictions` · `therapy_recommendations` | Fusion output |
| `therapy_sessions` | Practice-plan progress (one doc per child) |

Every prediction document carries `level`, `task_id` and the target word, so summaries can group results by level without assuming the child played every task in order.

---

## Model training

Models were trained in Google Colab — see [NOTEBOOKS.md](NOTEBOOKS.md) for notebook links.

---

## Limitations

Worth stating plainly for anyone evaluating this work:

- **Screening, not diagnosis.** Every result screen says so; the fusion response carries a `safety_note` to the same effect.
- **Practice effects.** Re-screening shortly after practising the same skills will show improvement partly from rehearsal, not only from reduced risk. Task words are fixed, so a child may meet the same word twice.
- **Therapy plans are rule-based**, not learned: 3 difficulty areas × 3 intensities = 9 possible plans. The plan uses the report's *conclusion*, not its per-level detail.
- **Demographic fields are hard-coded** in the API payloads (age 6, native language Sinhala) rather than collected from the user profile.

---

## Status

Active development. All three screening modules, the level system, text-to-speech guidance, the multi-modal fusion pipeline, and the therapy practice cycle are implemented.
