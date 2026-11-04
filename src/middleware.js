const jwt = require("jsonwebtoken");

function verifyJWT(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
}

const route = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch((err) => {
    console.error(err);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ message: "Something went wrong on our side. Please try again." });
    }
  });

module.exports = { verifyJWT, route };
