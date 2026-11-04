const express = require("express");
const { getDb } = require("../db");
const { verifyJWT, route } = require("../middleware");

const router = express.Router();

router.get("/", (req, res) => res.send("StudioSpace API running"));

router.get("/health", async (req, res) => {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Database connection failed" });
  }
});

router.get("/me", verifyJWT, (req, res) => res.json({ user: req.user }));

router.post(
  "/newsletter",
  route(async (req, res) => {
    const email = String((req.body && req.body.email) || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }
    const db = await getDb();
    await db
      .collection("subscribers")
      .updateOne({ email }, { $setOnInsert: { email, createdAt: new Date() } }, { upsert: true });
    res.status(201).json({ ok: true });
  })
);

module.exports = router;
