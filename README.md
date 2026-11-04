# StudioSpace Server
 
REST API for **StudioSpace**, a peer-to-peer marketplace for creative workspaces and production studios. Built with Express and MongoDB.
 
**Live API:** https://studiospace-server-beryl-xi.vercel.app (health check: `/health`)
**Client repository:** `studiospace-client` (live site: https://studiospace-client-liard.vercel.app)
 
---
 
## Highlights
 
- **JWT security (HTTPOnly cookie).** Protected routes read the `token` cookie and answer `401 Unauthorized` when it is missing or invalid.
- **Owner checks.** The owner of a studio or booking always comes from the verified token, never from the request body. Editing or deleting someone else's studio returns `403`.
- **Double-booking prevention.** Overlapping bookings are rejected with `409` and a clear message.
- **Host workflow.** Hosts confirm or decline booking requests on their studios.
- **Reviews.** One review per user per studio, never on your own studio. The average rating is recalculated with an aggregate.
- **Safe deletes.** Deleting a studio cancels its open bookings and removes its reviews.
- **Input validation.** Studio and review payloads are validated before they reach the database.
## Tech stack
 
Node.js, Express 4, MongoDB (native driver), jsonwebtoken, cookie-parser, cors, dotenv. Deployed on Vercel.
 
## Endpoints
 
Routes marked **JWT** require a valid `token` cookie.
 
| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | none | Status text |
| GET | `/health` | none | MongoDB ping |
| GET | `/me` | JWT | The user stored in the token |
| GET | `/studios` | none | List studios. Query: `category`, `q`, `sort` (newest, rating, price-asc, price-desc), `limit` (max 60) |
| GET | `/studios/:id` | none | One studio |
| GET | `/studios/:id/booked` | none | Upcoming Confirmed slots, so the booking form can show taken times |
| GET | `/studios/:id/reviews` | none | Reviews, newest first |
| GET | `/my-studios` | JWT | Studios owned by the signed-in user |
| POST | `/studios` | JWT | Create a studio |
| PUT | `/studios/:id` | JWT | Update a studio (owner only) |
| DELETE | `/studios/:id` | JWT | Delete a studio (owner only) |
| POST | `/studios/:id/reviews` | JWT | Add a review and update the average rating |
| POST | `/bookings` | JWT | Create a booking with status `Pending` |
| GET | `/my-bookings` | JWT | The user's reservations (past Confirmed bookings show as `Completed`) |
| GET | `/host-bookings` | JWT | Reservations made on the user's studios |
| PATCH | `/bookings/:id/cancel` | JWT | Guest cancels their own Pending booking |
| PATCH | `/bookings/:id/status` | JWT | Host sets `Confirmed` or `Cancelled` on a Pending booking |
| POST | `/newsletter` | none | Footer sign-up, one row per email |
 
Unknown routes return a JSON `404`.
 
## Double-booking prevention
 
Bookings store exact UTC instants (`startAt`, `endAt`), built from the guest's local date, times and time-zone offset. Before a booking is saved, and again when a host confirms one, the server looks for a `Confirmed` booking on the same studio where:
 
```
startAt < newEnd  AND  endAt > newStart
```
 
A collision returns `409` with a clear message and the conflicting slot. Back-to-back bookings, where one ends exactly when the next starts, are allowed. Bookings last 1 to 12 hours.
 
## Local setup
 
**Prerequisites:** Node.js 20 or later and a MongoDB Atlas database.
 
1. Install dependencies:
```bash
   npm install
```
2. Copy `.env.example` to `.env` and fill in the values:
   | Variable | Purpose |
   | --- | --- |
   | `MONGODB_URI` | MongoDB connection string |
   | `JWT_SECRET` | Must be identical to `JWT_SECRET` in the client repository |
   | `CLIENT_URL` | Allowed CORS origin, `http://localhost:3000` locally |
   | `PORT` | Server port, `5000` by default |
3. Start the server:
```bash
   npm run dev
```
   Open http://localhost:5000/health. It should return `{"ok":true}`.
4. Add sample data:
```bash
   npm run seed
   npm run seed -- --owner you@example.com --name "Your Name"   # list them under your own account
```
   The seed adds 12 sample studio listings. Running it again replaces the earlier sample listings.
 
## Deployment (Vercel)
 
`vercel.json` is included. Add the variables from `.env.example` to the Vercel project, with `CLIENT_URL` set to the live client URL (no trailing slash). In MongoDB Atlas, allow network access from `0.0.0.0/0` so Vercel can connect.