const LeaveApplication = require("../models/LeaveApplication");
const { isAdmin } = require("../utils/access");

async function getLeaveApplications(req, res, next) {
  try {
    const query = isAdmin(req.user) ? {} : { applicant: req.user._id };
    const leaves = await LeaveApplication.find(query).sort({ createdAt: -1 });
    return res.json({ leaves });
  } catch (error) {
    return next(error);
  }
}

async function createLeaveApplication(req, res, next) {
  try {
    const { fromDate, toDate, reason, substitutes } = req.body;
    if (!fromDate || !toDate || !String(reason || "").trim()) {
      return res.status(400).json({ message: "From date, to date, and reason are required." });
    }
    const from = new Date(fromDate);
    const to   = new Date(toDate);
    if (from > to) {
      return res.status(400).json({ message: "From date cannot be after to date." });
    }
    const leave = await LeaveApplication.create({
      applicant:     req.user._id,
      applicantName: req.user.name,
      fromDate:      from,
      toDate:        to,
      reason:        String(reason).trim(),
      substitutes:   Array.isArray(substitutes) ? substitutes : [],
    });
    return res.status(201).json({ leave });
  } catch (error) {
    return next(error);
  }
}

async function reviewLeaveApplication(req, res, next) {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ message: "Only admin can review leave applications." });
    }
    const { status, reviewNote } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'approved' or 'rejected'." });
    }
    const leave = await LeaveApplication.findByIdAndUpdate(
      req.params.id,
      {
        status,
        reviewNote:  String(reviewNote || "").trim(),
        reviewedBy:  req.user._id,
        reviewedAt:  new Date(),
      },
      { new: true },
    );
    if (!leave) {
      return res.status(404).json({ message: "Leave application not found." });
    }
    return res.json({ leave });
  } catch (error) {
    return next(error);
  }
}

async function deleteLeaveApplication(req, res, next) {
  try {
    // Admin can delete any; teacher can only delete their own pending applications
    const query = isAdmin(req.user)
      ? { _id: req.params.id }
      : { _id: req.params.id, applicant: req.user._id, status: "pending" };
    const leave = await LeaveApplication.findOneAndDelete(query);
    if (!leave) {
      return res.status(404).json({ message: "Leave application not found or cannot be deleted." });
    }
    return res.json({ message: "Leave application deleted.", leave });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getLeaveApplications,
  createLeaveApplication,
  reviewLeaveApplication,
  deleteLeaveApplication,
};
