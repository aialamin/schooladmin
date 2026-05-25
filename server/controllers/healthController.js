const mongoose = require("mongoose");

function getHealth(_req, res) {
  res.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
}

module.exports = {
  getHealth,
};
