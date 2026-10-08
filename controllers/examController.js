const Exam = require('../models/Exam');
const Program = require('../models/Program');
const Plan = require('../models/Plan');
const Batch = require('../models/Batch');

const withCounts = async (exams) => {
  return Promise.all(exams.map(async (exam) => {
    const programIds = await Program.find({ examId: exam._id }).distinct('_id');
    const [plansCount, batchesCount] = await Promise.all([
      Plan.countDocuments({ examIds: exam._id, isDeleted: { $ne: true } }),
      Batch.countDocuments({ $or: [{ examId: exam._id }, { programId: { $in: programIds } }] })
    ]);
    return { ...exam, programsCount: programIds.length, plansCount, batchesCount };
  }));
};

const DEFAULT_EXAMS = [
  { code: 'upsc', name: 'UPSC', nameHindi: 'यूपीएससी', displayOrder: 1, isVisibleOnWebsite: true },
  { code: 'uppsc', name: 'UPPSC', nameHindi: 'यूपीपीएससी', displayOrder: 2, isVisibleOnWebsite: true },
  { code: 'apsc', name: 'APSC', nameHindi: 'एपीएससी', displayOrder: 3, isVisibleOnWebsite: true },
  { code: 'epfo', name: 'EPFO', nameHindi: 'ईपीएफओ', displayOrder: 4, isVisibleOnWebsite: true }
];

const ensureExams = async () => {
  await Exam.bulkWrite(DEFAULT_EXAMS.map((exam) => ({
    updateOne: {
      filter: { code: exam.code },
      update: { $setOnInsert: { ...exam, isActive: true, isDeleted: false } },
      upsert: true
    }
  })));
};

const slugify = (value) => String(value || 'exam')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 55) || 'exam';

const getExams = async (_req, res) => {
  try {
    await ensureExams();
    const data = await Exam.find({
      isVisibleOnWebsite: { $ne: false },
      isDeleted: { $ne: true }
    })
      .sort({ displayOrder: 1, name: 1 })
      .select('-__v')
      .lean();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAdminExams = async (_req, res) => {
  try {
    await ensureExams();
    const exams = await Exam.find({ isDeleted: { $ne: true } })
      .sort({ displayOrder: 1, name: 1 })
      .select('-__v')
      .lean();
    res.json({ success: true, data: await withCounts(exams) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getExamById = async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).select('-__v').lean();
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    res.json({ success: true, data: exam });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const createExam = async (req, res) => {
  try {
    const input = {
      name: String(req.body.name || '').trim(),
      nameHindi: req.body.nameHindi || '',
      description: req.body.description || '',
      displayOrder: Number(req.body.displayOrder) || 0,
      isActive: req.body.isActive !== false,
      isVisibleOnWebsite: req.body.isVisibleOnWebsite !== false
    };
    if (!input.name) return res.status(400).json({ success: false, message: 'Exam name is required.' });
    input.code = String(req.body.code || slugify(input.name)).toLowerCase();
    const data = await Exam.create(input);
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 400).json({
      success: false,
      message: error.code === 11000 ? 'An exam with this code already exists.' : error.message
    });
  }
};

const updateExam = async (req, res) => {
  try {
    const allowed = ['name', 'nameHindi', 'description', 'displayOrder', 'isActive', 'isVisibleOnWebsite'];
    const update = Object.fromEntries(allowed.filter((key) => req.body[key] !== undefined).map((key) => [key, req.body[key]]));
    const data = await Exam.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      update,
      { new: true, runValidators: true }
    );
    if (!data) return res.status(404).json({ success: false, message: 'Exam not found' });

    if (update.name) {
      await Program.updateMany({ examId: data._id }, { $set: { examination: data.name } });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    const programIds = await Program.find({ examId: exam._id }).distinct('_id');
    const programsCount = programIds.length;
    const plansCount = await Plan.countDocuments({ examIds: exam._id, isDeleted: { $ne: true } });
    const batchesCount = await Batch.countDocuments({ $or: [{ examId: exam._id }, { programId: { $in: programIds } }] });
    if (programsCount || plansCount || batchesCount) {
      return res.status(409).json({
        success: false,
        programsCount,
        plansCount,
        batchesCount,
        message: `Cannot delete this exam: ${programsCount} program(s), ${plansCount} plan(s) and ${batchesCount} batch(es) depend on it.`
      });
    }

    exam.isActive = false;
    exam.isDeleted = true;
    await exam.save();
    res.json({ success: true, message: 'Exam deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  ensureExams,
  getExams,
  getAdminExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam
};
