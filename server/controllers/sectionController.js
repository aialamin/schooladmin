const ClassSection = require("../models/ClassSection");

async function listSections(req, res, next) {
  try {
    // Teachers see only their own sections; admin/accounts see all
    const filter = {};
    if (req.user.role === "teacher") {
      filter.classTeacher = req.user._id;
    }
    const sections = await ClassSection.find(filter)
      .populate("classTeacher", "name email role")
      .sort({ className: 1, sectionName: 1 });
    return res.json({ sections });
  } catch (err) {
    return next(err);
  }
}

async function createSection(req, res, next) {
  try {
    const { className, sectionName, classTeacher, academicYear } = req.body;
    if (!className || !sectionName) {
      return res.status(400).json({ message: "Class name and section name are required." });
    }
    const section = await ClassSection.create({
      className: className.trim(),
      sectionName: sectionName.trim(),
      classTeacher: classTeacher || null,
      academicYear: academicYear || String(new Date().getFullYear()),
    });
    await section.populate("classTeacher", "name email role");
    return res.status(201).json(section);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "A section with this class, name and year already exists." });
    }
    return next(err);
  }
}

async function updateSection(req, res, next) {
  try {
    const { className, sectionName, classTeacher, academicYear } = req.body;
    const section = await ClassSection.findByIdAndUpdate(
      req.params.id,
      {
        className: className?.trim(),
        sectionName: sectionName?.trim(),
        classTeacher: classTeacher || null,
        academicYear,
      },
      { new: true, runValidators: true }
    ).populate("classTeacher", "name email role");
    if (!section) return res.status(404).json({ message: "Section not found." });
    return res.json(section);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "A section with this class, name and year already exists." });
    }
    return next(err);
  }
}

async function deleteSection(req, res, next) {
  try {
    const section = await ClassSection.findByIdAndDelete(req.params.id);
    if (!section) return res.status(404).json({ message: "Section not found." });
    return res.json({ message: "Section deleted." });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listSections, createSection, updateSection, deleteSection };
