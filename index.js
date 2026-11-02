require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { MongoClient } = require("mongodb");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Cached Mongo connection (important for Vercel serverless)
const client = new MongoClient(process.env.MONGODB_URI);
let db;
async function getDb() {
  if (!db) {
    await client.connect();
    db = client.db("studiospace");
  }
  return db;
}

// Verifies the HTTPOnly JWT cookie; rejects with 401 if missing or invalid
const verifyJWT = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
};

app.get("/", (req, res) => res.send("StudioSpace API running"));

// Quick check that the database connection works
app.get("/health", async (req, res) => {
  try {
    const database = await getDb();
    await database.command({ ping: 1 });
    res.json({ ok: true });
  // } catch (err) {
  //   res.status(500).json({ ok: false, message: "Database connection failed" });
  // }
    } catch (err) {
    console.error("Health check failed:", err.message);
    res.status(500).json({
      ok: false,
      message: process.env.NODE_ENV === "production" ? "Database connection failed" : err.message,
    });
  }
});

// Example protected route to test Challenge 1 (remove later)
app.get("/me", verifyJWT, (req, res) => res.json({ user: req.user }));

// Studio and booking routes are added in Phase 3

module.exports = app;

if (!process.env.VERCEL) {
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`StudioSpace server on port ${port}`));
}
