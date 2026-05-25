const express = require("express");
const { getSchoolSettings, updateSchoolSettings } = require("../controllers/schoolSettingController");
const { adminOnly, protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.get("/", getSchoolSettings);
router.put("/", adminOnly, updateSchoolSettings);

module.exports = router;
