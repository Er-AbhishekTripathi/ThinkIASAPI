const Question = require('../models/Question');
const Tag = require('../models/Tag');
const { parseCSV, validateQuestions } = require('../utils/questionImport');
const { fetchSheetQuestions } = require('../utils/googleSheetImport');

const saveQuestions = async (req, input) => {
  validateQuestions(input);
  const tags = await Tag.find().select('_id tag').lean();
  const tagLookup = new Map(tags.flatMap(tag => [[String(tag._id), String(tag._id)], [String(tag.tag).toLowerCase(), String(tag._id)]]));
  const documents = input.map((item, index) => ({
    question: item.question,
    description: item.description || { english: '', hindi: '' },
    options: item.options,
    correctAnswer: item.correctAnswer,
    tags: (item.tags || []).map(tag => {
      const id = tagLookup.get(tag.toLowerCase());
      if (!id) throw new Error(`Question ${index + 1}: unknown tag "${tag}". Create the tag first.`);
      return id;
    }),
    createdBy: req.user._id
  }));
  await Promise.all(documents.map(document => new Question(document).validate()));
  if (req.body.preview === 'true' || req.body.preview === true) return { preview: true, count: documents.length, questions: documents };
  const saved = await Question.insertMany(documents, { ordered: true });
  return { preview: false, count: saved.length, message: `${saved.length} questions imported.`, messageHindi: `${saved.length} प्रश्न आयात किए गए।` };
};

exports.importQuestions = async (req, res) => {
  try {
    let input = req.body.questions;
    if (req.file) {
      const content = req.file.buffer.toString('utf8').replace(/^\uFEFF/, '');
      input = req.file.originalname.toLowerCase().endsWith('.csv') ? parseCSV(content) : JSON.parse(content);
      if (!Array.isArray(input)) input = input.questions;
    }
    const result = await saveQuestions(req, input);
    if (result.preview) return res.json({ success: true, count: result.count, questions: result.questions });
    res.status(201).json({ success: true, count: result.count, message: result.message, messageHindi: result.messageHindi });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

exports.importFromSheet = async (req, res) => {
  try {
    const input = await fetchSheetQuestions(req.body.url);
    const result = await saveQuestions(req, input);
    if (result.preview) return res.json({ success: true, count: result.count, questions: result.questions });
    res.status(201).json({ success: true, count: result.count, message: result.message, messageHindi: result.messageHindi });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};
