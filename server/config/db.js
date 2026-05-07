const mongoose = require("mongoose");

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/EducationManagement";
  const dbName = process.env.MONGODB_DB || "";
  const options = {
    serverSelectionTimeoutMS: 10000,
    serverApi: {
      version: "1",
      strict: true,
      deprecationErrors: true,
    },
  };

  if (dbName) {
    options.dbName = dbName;
  }

  await mongoose.connect(mongoUri, options);
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}

module.exports = connectDB;
