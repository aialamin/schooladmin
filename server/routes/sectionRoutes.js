const express = require("express");
const {
  createSection,
  deleteSection,
  listSections,
  updateSection,
} = require("../controllers/sectionController");
const { permitRoles, protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.get("/", listSections);
router.post("/", permitRoles("admin"), createSection);
router.put("/:id", permitRoles("admin"), updateSection);
router.delete("/:id", permitRoles("admin"), deleteSection);

module.exports = router;
