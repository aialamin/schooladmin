function errorHandler(error, _req, res, next) {
  void next;

  // MongoDB duplicate key
  if (error.code === 11000) {
    return res.status(409).json({ message: "A record with this unique value already exists." });
  }

  // Mongoose schema validation failure
  if (error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }

  // Mongoose CastError — invalid ObjectId or wrong field type sent by client
  if (error.name === "CastError") {
    return res.status(400).json({ message: `Invalid value for field "${error.path}".` });
  }

  // Application-level business rule / validation errors thrown manually in service files
  if (/not found|required|valid|select|must be|must have|cannot exceed|cannot be lower|already entered|already has|already exists for|conflict:|greater than 0|between 0 and|at least \d/i.test(error.message || "")) {
    return res.status(400).json({ message: error.message });
  }

  // Genuine server error
  return res.status(500).json({
    message: error.message || "Server error.",
  });
}

module.exports = errorHandler;
