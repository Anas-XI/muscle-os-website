# Muscle OS Mobile

React Native (Expo) mobile app for the Muscle OS AI fitness coaching system.

## Architecture

- **Mobile:** Expo (React Native) with Expo Router
- **Backend:** Python FastAPI microservice (at `backend/`)
- **Database:** Supabase (PostgreSQL)

## Setup

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
# Set SUPABASE_URL and SUPABASE_SERVICE_KEY in ../../.env
uvicorn main:app --reload --port 8000
```

### 2. Mobile

```bash
cd mobile
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_API_URL
npx expo start
```

### 3. Supabase

Run `../supabase/schema.sql` in the Supabase SQL editor to create tables and RLS policies.

## Structure

```
mobile/
├── app/              # Expo Router screens
│   ├── _layout.tsx   # Root layout (auth check)
│   ├── (auth)/       # Login, Signup
│   └── (app)/        # Chat, Profile, Program (authenticated)
├── components/       # Reusable UI (ChatBubble, StreamingText)
├── services/         # Supabase client, API client
└── stores/           # Zustand stores

backend/
├── main.py           # FastAPI entry
├── config.py         # Config + sys.path setup for existing code
├── routers/          # API route handlers
└── services/         # LLM + program generation services

supabase/
└── schema.sql        # Database schema
```
