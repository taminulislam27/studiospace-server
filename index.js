require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const miscRoutes = require("./src/routes/misc");
const studioRoutes = require("./src/routes/studios");
const bookingRoutes = require("./src/routes/bookings");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use(miscRoutes);
app.use(studioRoutes);
app.use(bookingRoutes);

app.use((req, res) => res.status(404).json({ message: "Route not found." }));

module.exports = app;

if (!process.env.VERCEL) {
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`StudioSpace server on port ${port}`));
}
