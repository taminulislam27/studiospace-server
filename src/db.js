const { MongoClient, ObjectId } = require("mongodb");

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

function toObjectId(id) {
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id) ? new ObjectId(id) : null;
}

module.exports = { getDb, toObjectId, ObjectId };
