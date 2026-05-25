const ClassFee = require("../models/ClassFee");
const { createClassFee, updateClassFee } = require("../services/feeService");

async function getClassFees(_req, res, next) {
  try {
    const classFees = await ClassFee.find().sort({ className: 1 });
    return res.json({ classFees });
  } catch (error) {
    return next(error);
  }
}

async function createClassFeeRule(req, res, next) {
  try {
    const classFee = await createClassFee(req.body);
    return res.status(201).json({ classFee });
  } catch (error) {
    return next(error);
  }
}

async function updateClassFeeRule(req, res, next) {
  try {
    const classFee = await updateClassFee(req.params.id, req.body);
    return res.json({ classFee });
  } catch (error) {
    return next(error);
  }
}

async function deleteClassFeeRule(req, res, next) {
  try {
    const classFee = await ClassFee.findByIdAndDelete(req.params.id);
    if (!classFee) {
      return res.status(404).json({ message: "Class fee rule was not found." });
    }

    return res.json({ message: "Class fee rule deleted.", classFee });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createClassFeeRule,
  deleteClassFeeRule,
  getClassFees,
  updateClassFeeRule,
};
