const { MongoClient, ObjectId } = require("mongodb");

// One cached connection promise, so concurrent first requests share it
// (important on Vercel serverless, where the module is reused between calls).
let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    const client = new MongoClient(process.env.MONGODB_URI);
    dbPromise = client
      .connect()
      .then(() => client.db("studiospace"))
      .catch((err) => {
        dbPromise = null;
        throw err;
      });
  }
  return dbPromise;
}

// Strict 24-character hex check (ObjectId.isValid also accepts any 12-char string).
function toObjectId(id) {
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id) ? new ObjectId(id) : null;
}

module.exports = { getDb, toObjectId, ObjectId };
