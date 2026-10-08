const ProgramStage = require('../models/ProgramStage');
const Program = require('../models/Program');

const DEFAULT_STAGES = [
  { code: 'prelims', name: 'Prelims', nameHindi: 'प्रीलिम्स', displayOrder: 1 },
  { code: 'mains', name: 'Mains', nameHindi: 'मेन्स', displayOrder: 2 },
  { code: 'interview', name: 'Interview', nameHindi: 'इंटरव्यू', displayOrder: 3 },
  { code: 'combo-i', name: 'Combo I', nameHindi: 'कॉम्बो I', displayOrder: 4 },
  { code: 'combo-ii', name: 'Combo II', nameHindi: 'कॉम्बो II', displayOrder: 5 }
];

const ensureStages = async () => {
  await ProgramStage.bulkWrite(DEFAULT_STAGES.map((stage) => ({
    updateOne: {
      filter: { code: stage.code },
      update: { $setOnInsert: { ...stage, isActive: true, isDeleted: false } },
      upsert: true
    }
  })));
};

const slugify = (value) => String(value || 'program')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 55) || 'program';

const withCounts = async (stages) => Promise.all(stages.map(async (stage) => {
  const programsCount = await Program.countDocuments({ programStage: stage.name });
  return { ...stage, programsCount };
}));

const getProgramStages = async (_req, res) => {
  try {
    await ensureStages();
    const data = await ProgramStage.find({ isActive: true, isDeleted: { $ne: true } })
      .sort({ displayOrder: 1, name: 1 })
      .select('-__v')
      .lean();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAdminProgramStages = async (_req, res) => {
  try {
    await ensureStages();
    const stages = await ProgramStage.find({ isDeleted: { $ne: true } })
      .sort({ displayOrder: 1, name: 1 })
      .select('-__v')
      .lean();
    res.json({ success: true, data: await withCounts(stages) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createProgramStage = async (req, res) => {
  try {
    const input = {
      name: String(req.body.name || '').trim(),
      nameHindi: req.body.nameHindi || '',
      displayOrder: Number(req.body.displayOrder) || 0,
      isActive: req.body.isActive !== false
    };
    if (!input.name) return res.status(400).json({ success: false, message: 'Program type name is required.' });
    input.code = String(req.body.code || slugify(input.name)).toLowerCase();
    const data = await ProgramStage.create(input);
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 400).json({
      success: false,
      message: error.code === 11000 ? 'A program type with this name already exists.' : error.message
    });
  }
};

const updateProgramStage = async (req, res) => {
  try {
    const existing = await ProgramStage.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!existing) return res.status(404).json({ success: false, message: 'Program type not found' });

    const previousName = existing.name;
    const allowed = ['name', 'nameHindi', 'displayOrder', 'isActive'];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) existing[key] = req.body[key];
    });
    existing.name = String(existing.name || '').trim();
    if (!existing.name) return res.status(400).json({ success: false, message: 'Program type name is required.' });
    await existing.save();

    if (previousName !== existing.name) {
      await Program.updateMany({ programStage: previousName }, { $set: { programStage: existing.name } });
    }

    res.json({ success: true, data: existing });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 400).json({
      success: false,
      message: error.code === 11000 ? 'A program type with this name already exists.' : error.message
    });
  }
};

const deleteProgramStage = async (req, res) => {
  try {
    const stage = await ProgramStage.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!stage) return res.status(404).json({ success: false, message: 'Program type not found' });

    const programsCount = await Program.countDocuments({ programStage: stage.name });
    if (programsCount) {
      return res.status(409).json({
        success: false,
        programsCount,
        message: `Cannot delete this program type: ${programsCount} program(s) use it.`
      });
    }

    stage.isActive = false;
    stage.isDeleted = true;
    await stage.save();
    res.json({ success: true, message: 'Program type deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  ensureStages,
  getProgramStages,
  getAdminProgramStages,
  createProgramStage,
  updateProgramStage,
  deleteProgramStage
};
