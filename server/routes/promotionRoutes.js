const express = require("express");
const { protect, permitRoles } = require("../middleware/authMiddleware");
const { previewPromotion, runAnnualPromotion, DEFAULT_PASS_PERCENT } = require("../services/promotionService");

const router = express.Router();

router.use(protect, permitRoles("admin"));

// GET /api/promotion/preview — preview who will be promoted/graduated/retained
router.get("/preview", async (req, res, next) => {
  try {
    const year     = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const passMark = req.query.passMark ? Number(req.query.passMark) : DEFAULT_PASS_PERCENT;
    const result   = await previewPromotion(year, passMark);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

// POST /api/promotion/run — run annual promotion now (admin manual trigger)
router.post("/run", async (req, res, next) => {
  try {
    const year     = req.body.year     ? Number(req.body.year)     : new Date().getFullYear();
    const passMark = req.body.passMark ? Number(req.body.passMark) : DEFAULT_PASS_PERCENT;
    const result   = await runAnnualPromotion(year, passMark, `admin:${req.user?.email || req.user?._id}`);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
