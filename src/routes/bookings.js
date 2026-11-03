const express = require("express");
const { getDb, toObjectId } = require("../db");
const { verifyJWT, route } = require("../middleware");
const { buildSlot, withEffectiveStatus } = require("../time");

const router = express.Router();

const BAD_ID = { message: "That booking link is not valid." };

// Challenge 2: finds a Confirmed booking for the studio that collides with the
// requested range. Two ranges collide when start < otherEnd AND end > otherStart.
function findConfirmedConflict(bookings, studioId, startAt, endAt, excludeId) {
  const query = {
    studioId,
    status: "Confirmed",
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
  };
  if (excludeId) query._id = { $ne: excludeId };
  return bookings.findOne(query);
}

const conflictBody = (conflict, message) => ({
  message,
  conflict: { startAt: conflict.startAt, endAt: conflict.endAt },
});

// Create a booking (starts as "Pending")
router.post(
  "/bookings",
  verifyJWT,
  route(async (req, res) => {
    const body = req.body || {};
    const studioId = toObjectId(body.studioId);
    if (!studioId) return res.status(400).json({ message: "Choose a studio to book." });

    const slot = buildSlot(body);
    if (slot.error) return res.status(400).json({ message: slot.error });
    if (slot.startAt <= new Date()) {
      return res.status(400).json({ message: "Pick a start time in the future." });
    }

    const db = await getDb();
    const studio = await db.collection("studios").findOne({ _id: studioId });
    if (!studio) return res.status(404).json({ message: "Studio not found." });

    const guests = Number(body.guests);
    if (!Number.isInteger(guests) || guests < 1 || guests > studio.maxCapacity) {
      return res
        .status(400)
        .json({ message: `Guests must be between 1 and ${studio.maxCapacity} for this studio.` });
    }

    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
    const bookings = db.collection("bookings");

    const conflict = await findConfirmedConflict(bookings, studioId, slot.startAt, slot.endAt);
    if (conflict) {
      return res
        .status(409)
        .json(
          conflictBody(
            conflict,
            "That time overlaps a confirmed booking for this studio. Please choose a different slot."
          )
        );
    }

    const doc = {
      studioId,
      studioTitle: studio.title,
      studioImage: studio.image,
      studioLocation: studio.location,
      studioCategory: studio.category,
      hostEmail: studio.ownerEmail,
      hostName: studio.ownerName,
      userEmail: req.user.email,
      userName: req.user.name || req.user.email,
      date: body.date,
      startTime: body.startTime,
      endTime: body.endTime,
      startAt: slot.startAt,
      endAt: slot.endAt,
      hours: slot.hours,
      guests,
      note,
      hourlyRate: studio.hourlyRate,
      totalPrice: Math.round(slot.hours * studio.hourlyRate * 100) / 100,
      securityDeposit: studio.securityDeposit,
      status: "Pending",
      createdAt: new Date(),
    };
    const result = await bookings.insertOne(doc);
    res.status(201).json({ ...doc, _id: result.insertedId });
  })
);

// The signed-in user's own reservations
router.get(
  "/my-bookings",
  verifyJWT,
  route(async (req, res) => {
    const db = await getDb();
    const list = await db
      .collection("bookings")
      .find({ userEmail: req.user.email })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(list.map((b) => withEffectiveStatus(b)));
  })
);

// Reservations made on studios the signed-in user hosts
router.get(
  "/host-bookings",
  verifyJWT,
  route(async (req, res) => {
    const db = await getDb();
    const list = await db
      .collection("bookings")
      .find({ hostEmail: req.user.email })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(list.map((b) => withEffectiveStatus(b)));
  })
);

// Guest cancels their own Pending booking
router.patch(
  "/bookings/:id/cancel",
  verifyJWT,
  route(async (req, res) => {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json(BAD_ID);

    const db = await getDb();
    const bookings = db.collection("bookings");
    const booking = await bookings.findOne({ _id });
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (booking.userEmail !== req.user.email) {
      return res.status(403).json({ message: "You can only cancel your own bookings." });
    }
    if (booking.status !== "Pending") {
      return res.status(400).json({ message: "Only pending bookings can be cancelled." });
    }

    const cancelledAt = new Date();
    await bookings.updateOne(
      { _id },
      { $set: { status: "Cancelled", cancelReason: "Cancelled by the guest.", cancelledAt } }
    );
    res.json({ ...booking, status: "Cancelled", cancelledAt });
  })
);

// Host confirms or declines a Pending booking
router.patch(
  "/bookings/:id/status",
  verifyJWT,
  route(async (req, res) => {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json(BAD_ID);

    const next = req.body && req.body.status;
    if (next !== "Confirmed" && next !== "Cancelled") {
      return res.status(400).json({ message: "Status must be Confirmed or Cancelled." });
    }

    const db = await getDb();
    const bookings = db.collection("bookings");
    const booking = await bookings.findOne({ _id });
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (booking.hostEmail !== req.user.email) {
      return res.status(403).json({ message: "Only the host can update this booking." });
    }
    if (booking.status !== "Pending") {
      return res.status(400).json({ message: "Only pending bookings can be updated." });
    }

    if (next === "Confirmed") {
      const conflict = await findConfirmedConflict(
        bookings,
        booking.studioId,
        booking.startAt,
        booking.endAt,
        _id
      );
      if (conflict) {
        return res
          .status(409)
          .json(
            conflictBody(
              conflict,
              "You cannot confirm this request because it overlaps a booking you already confirmed."
            )
          );
      }
    }

    const set =
      next === "Confirmed"
        ? { status: "Confirmed", confirmedAt: new Date() }
        : { status: "Cancelled", cancelReason: "Declined by the host.", cancelledAt: new Date() };
    await bookings.updateOne({ _id }, { $set: set });
    res.json({ ...booking, ...set });
  })
);

module.exports = router;
