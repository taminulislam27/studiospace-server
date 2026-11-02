# StudioSpace Server

Express + MongoDB API for the StudioSpace platform.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in the values
3. `npm run dev` (runs on http://localhost:5000)

## Endpoints (Phase 0)

- `GET /` : status text
- `GET /health` : MongoDB ping
- `GET /me` : returns the JWT user (requires the HTTPOnly `token` cookie)

## Deploy

Deploy to Vercel (`vercel.json` is included) and add the env vars from `.env.example`.
