const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["asset", "tour", "food", "gift", "event", "stationery", "utility", "maintenance", "other"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    paidTo: { type: String, trim: true, default: "" },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank", "cheque", "online"],
      default: "cash",
    },
    receiptNo: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

expenseSchema.index({ date: -1, category: 1 });

module.exports = mongoose.model("Expense", expenseSchema);
