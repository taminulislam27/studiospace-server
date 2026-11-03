# StudioSpace Server

Express + MongoDB API for the StudioSpace platform. Client repo: `studiospace-client`.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in the values
3. `npm run dev` (runs on http://localhost:5000)
4. `npm run seed` to add 12 sample studio listings (see Seeding below)

`JWT_SECRET` must be the same value as `JWT_SECRET` in the client `.env.local`.

## Endpoints

Routes marked **JWT** read the HTTPOnly `token` cookie and answer `401 Unauthorized` when it is
missing or invalid (Challenge 1). The owner of a studio or booking always comes from the verified
token, never from the request body.

| Method | Route | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/` | none | Status text |
| GET | `/health` | none | MongoDB ping |
| GET | `/me` | JWT | The user stored in the token |
| GET | `/studios` | none | Query: `category`, `q`, `sort` (newest, rating, price-asc, price-desc), `limit` (max 60) |
| GET | `/studios/:id` | none | One studio |
| GET | `/studios/:id/booked` | none | Upcoming Confirmed slots, so the booking form can show taken times |
| GET | `/studios/:id/reviews` | none | Reviews, newest first |
| GET | `/my-studios` | JWT | Studios owned by the signed-in user |
| POST | `/studios` | JWT | Create a studio |
| PUT | `/studios/:id` | JWT | Update (owner only, else 403) |
| DELETE | `/studios/:id` | JWT | Delete (owner only); cancels its open bookings and removes its reviews |
| POST | `/studios/:id/reviews` | JWT | One review per user, not on your own studio; updates the average rating |
| POST | `/bookings` | JWT | Creates a booking with status `Pending` |
| GET | `/my-bookings` | JWT | The user's reservations (Confirmed bookings in the past show as `Completed`) |
| GET | `/host-bookings` | JWT | Reservations made on the user's studios |
| PATCH | `/bookings/:id/cancel` | JWT | Guest cancels their own Pending booking |
| PATCH | `/bookings/:id/status` | JWT | Host sets `Confirmed` or `Cancelled` on a Pending booking |
| POST | `/newsletter` | none | Footer sign-up, one row per email |

## Double-booking prevention (Challenge 2)

Bookings store exact UTC instants (`startAt`, `endAt`), built from the guest's local date, times and
time-zone offset. Before a booking is saved, and again when a host confirms one, the server looks for
a `Confirmed` booking on the same studio where `startAt < newEnd AND endAt > newStart`. A collision
returns `409` with a clear message and the conflicting slot. Back-to-back bookings (one ends exactly
when the next starts) are allowed. Bookings last 1 to 12 hours.

## Seeding

```bash
npm run seed                                              # sample host
npm run seed -- --owner you@example.com --name "Your Name"  # list them under your own account
```

The 12 listings are sample data. Running the command again replaces the earlier sample listings.
Their cover images are illustrations that ship with the client (`public/studios`).

## Tests

`src/time.js` (slot maths) and `src/validators.js` (request validation) have no dependencies, so
they are easy to unit test.

## Deploy

Deploy to Vercel (`vercel.json` is included) and add the env vars from `.env.example`.
In MongoDB Atlas, allow network access from anywhere (`0.0.0.0/0`) so Vercel can connect.
