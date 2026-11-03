const express = require("express");
const { getDb, toObjectId } = require("../db");
const { verifyJWT, route } = require("../middleware");
const { parseStudio, parseReview } = require("../validators");

const router = express.Router();

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SORTS = {
  newest: { createdAt: -1 },
  rating: { rating: -1, createdAt: -1 },
  "price-asc": { hourlyRate: 1 },
  "price-desc": { hourlyRate: -1 },
};

const BAD_ID = { message: "That studio link is not valid." };

// ---------- Public reads ----------

// List studios. Query: category, q (title/location search), sort, limit (max 60)
router.get(
  "/studios",
  route(async (req, res) => {
    const { category, q, sort = "newest" } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 60, 1), 60);

    const filter = {};
    if (category) filter.category = String(category);
    if (q && String(q).trim()) {
      const rx = new RegExp(escapeRegex(String(q).trim()), "i");
      filter.$or = [{ title: rx }, { location: rx }, { category: rx }];
    }

    const db = await getDb();
    const studios = await db
      .collection("studios")
      .find(filter)
      .sort(SORTS[sort] || SORTS.newest)
      .limit(limit)
      .toArray();
    res.json(studios);
  })
);

router.get(
  "/studios/:id",
  route(async (req, res) => {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json(BAD_ID);
    const db = await getDb();
    const studio = await db.collection("studios").findOne({ _id });
    if (!studio) return res.status(404).json({ message: "Studio not found." });
    res.json(studio);
  })
);

// Confirmed upcoming slots, so the booking form can show what is already taken
router.get(
  "/studios/:id/booked",
  route(async (req, res) => {
    const studioId = toObjectId(req.params.id);
    if (!studioId) return res.status(400).json(BAD_ID);
    const db = await getDb();
    const slots = await db
      .collection("bookings")
      .find({ studioId, status: "Confirmed", endAt: { $gt: new Date() } })
      .project({ startAt: 1, endAt: 1 })
      .sort({ startAt: 1 })
      .toArray();
    res.json(slots);
  })
);

router.get(
  "/studios/:id/reviews",
  route(async (req, res) => {
    const studioId = toObjectId(req.params.id);
    if (!studioId) return res.status(400).json(BAD_ID);
    const db = await getDb();
    const reviews = await db
      .collection("reviews")
      .find({ studioId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    res.json(reviews);
  })
);

// ---------- Protected by the JWT cookie ----------

// Studios owned by the signed-in user
router.get(
  "/my-studios",
  verifyJWT,
  route(async (req, res) => {
    const db = await getDb();
    const studios = await db
      .collection("studios")
      .find({ ownerEmail: req.user.email })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(studios);
  })
);

// Create. The owner always comes from the verified token, never from the request body.
router.post(
  "/studios",
  verifyJWT,
  route(async (req, res) => {
    const { error, data } = parseStudio(req.body);
    if (error) return res.status(400).json({ message: error });

    const now = new Date();
    const doc = {
      ...data,
      ownerEmail: req.user.email,
      ownerName: req.user.name || req.user.email,
      rating: 0,
      reviewCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    const db = await getDb();
    const result = await db.collection("studios").insertOne(doc);
    res.status(201).json({ ...doc, _id: result.insertedId });
  })
);

// Update (owner only)
router.put(
  "/studios/:id",
  verifyJWT,
  route(async (req, res) => {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json(BAD_ID);

    const db = await getDb();
    const studios = db.collection("studios");
    const studio = await studios.findOne({ _id });
    if (!studio) return res.status(404).json({ message: "Studio not found." });
    if (studio.ownerEmail !== req.user.email) {
      return res.status(403).json({ message: "You can only edit your own studios." });
    }

    const { error, data } = parseStudio(req.body);
    if (error) return res.status(400).json({ message: error });

    const updatedAt = new Date();
    await studios.updateOne({ _id }, { $set: { ...data, updatedAt } });
    res.json({ ...studio, ...data, updatedAt });
  })
);

// Delete (owner only). Open bookings for the studio are cancelled, its reviews removed.
router.delete(
  "/studios/:id",
  verifyJWT,
  route(async (req, res) => {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json(BAD_ID);

    const db = await getDb();
    const studios = db.collection("studios");
    const studio = await studios.findOne({ _id });
    if (!studio) return res.status(404).json({ message: "Studio not found." });
    if (studio.ownerEmail !== req.user.email) {
      return res.status(403).json({ message: "You can only delete your own studios." });
    }

    await studios.deleteOne({ _id });
    await db.collection("reviews").deleteMany({ studioId: _id });
    await db.collection("bookings").updateMany(
      { studioId: _id, status: { $in: ["Pending", "Confirmed"] } },
      {
        $set: {
          status: "Cancelled",
          cancelReason: "The host removed this studio listing.",
          cancelledAt: new Date(),
        },
      }
    );
    res.json({ ok: true });
  })
);

// Add a review (one per user per studio, not on your own studio)
router.post(
  "/studios/:id/reviews",
  verifyJWT,
  route(async (req, res) => {
    const studioId = toObjectId(req.params.id);
    if (!studioId) return res.status(400).json(BAD_ID);

    const { error, data } = parseReview(req.body);
    if (error) return res.status(400).json({ message: error });

    const db = await getDb();
    const studios = db.collection("studios");
    const reviews = db.collection("reviews");

    const studio = await studios.findOne({ _id: studioId });
    if (!studio) return res.status(404).json({ message: "Studio not found." });
    if (studio.ownerEmail === req.user.email) {
      return res.status(403).json({ message: "You cannot review your own studio." });
    }
    if (await reviews.findOne({ studioId, userEmail: req.user.email })) {
      return res.status(409).json({ message: "You have already reviewed this studio." });
    }

    const review = {
      studioId,
      userEmail: req.user.email,
      userName: req.user.name || req.user.email,
      ...data,
      createdAt: new Date(),
    };
    const result = await reviews.insertOne(review);

    // Keep the studio's average rating in step with its reviews
    const [agg] = await reviews
      .aggregate([
        { $match: { studioId } },
        { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
      ])
      .toArray();
    await studios.updateOne(
      { _id: studioId },
      { $set: { rating: Math.round(agg.avg * 10) / 10, reviewCount: agg.count } }
    );

    res.status(201).json({ ...review, _id: result.insertedId });
  })
);

module.exports = router;
