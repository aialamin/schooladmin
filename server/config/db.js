const mongoose = require("mongoose");

async function connectDB() {
  // Defer require to avoid circular dependency at module load time.
  // dbConfigService reads school-config.json which may not exist yet on first run.
  const { getUri } = require("../services/dbConfigService");
  const mongoUri = getUri();

  const options = {
    serverSelectionTimeoutMS: 10000,
  };

  await mongoose.connect(mongoUri, options);
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}

module.exports = connectDB;
