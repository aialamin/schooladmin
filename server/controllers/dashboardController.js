const { getDashboardSummary } = require("../services/dashboardService");

async function getDashboard(req, res, next) {
  try {
    const dashboard = await getDashboardSummary(req.user);
    return res.json({ dashboard });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getDashboard,
};
