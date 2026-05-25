const Expense = require("../models/Expense");

async function listExpenses(req, res, next) {
  try {
    const query = {};
    if (req.query.category) query.category = req.query.category;
    if (req.query.from || req.query.to) {
      query.date = {};
      if (req.query.from) query.date.$gte = new Date(req.query.from);
      if (req.query.to) query.date.$lte = new Date(req.query.to);
    }
    const expenses = await Expense.find(query)
      .populate("createdBy", "name")
      .sort({ date: -1, createdAt: -1 });
    return res.json({ expenses });
  } catch (err) {
    return next(err);
  }
}

async function createExpense(req, res, next) {
  try {
    const expense = await Expense.create({ ...req.body, createdBy: req.user._id });
    return res.status(201).json({ expense });
  } catch (err) {
    return next(err);
  }
}

async function updateExpense(req, res, next) {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!expense) return res.status(404).json({ message: "Expense not found." });
    return res.json({ expense });
  } catch (err) {
    return next(err);
  }
}

async function removeExpense(req, res, next) {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    return res.json({ message: "Deleted." });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createExpense, listExpenses, removeExpense, updateExpense };
