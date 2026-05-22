const express = require("express");
const {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
} = require("../controllers/userController");
const { adminOnly, protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, adminOnly);

router.get("/", getUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;
