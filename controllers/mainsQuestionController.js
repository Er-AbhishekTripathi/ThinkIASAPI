const mongoose = require('mongoose');
const MainsQuestion = require('../models/MainsQuestion');
const MainsTag = require('../models/MainsTag');
const { handleError } = require('../middleware/errorHandler');
const { parseTheoryDocumentQuestions } = require('../utils/questionImport');

const normalizeQuestion = (body) => ({
  question: {
    english: typeof body.question?.english === 'string' ? body.question.english.trim() : '',
    hindi: typeof body.question?.hindi === 'string' ? body.question.hindi.trim() : ''
  },
  tags: Array.isArray(body.tags) ? [...new Set(body.tags)] : []
});

const hasQuestionText = value => value
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;|&#160;|&#xA0;/gi, ' ')
  .trim().length > 0;

const validateQuestion = async (question) => {
  if (!hasQuestionText(question.question.english)) return 'English question text is required.';
  if (question.tags.some(id => !mongoose.isValidObjectId(id))) return 'One or more selected Mains tags are invalid.';
  if (question.tags.length) {
    const tagsCount = await MainsTag.countDocuments({ _id: { $in: question.tags } });
    if (tagsCount !== question.tags.length) return 'One or more selected Mains tags do not exist.';
  }
  return null;
};

const getQuestions = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const filter = {};
    if (req.query.tagId) {
      if (!mongoose.isValidObjectId(req.query.tagId)) {
        return res.status(400).json({ message: 'Invalid Mains tag ID.' });
      }
      filter.tags = req.query.tagId;
    }
    if (typeof req.query.search === 'string' && req.query.search.trim()) {
      const rawSearch = req.query.search.trim();
      if (rawSearch.length > 200) {
        return res.status(400).json({ message: 'Search must be 200 characters or fewer.' });
      }
      const search = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { 'question.english': { $regex: search, $options: 'i' } },
        { 'question.hindi': { $regex: search, $options: 'i' } }
      ];
    }
    const [questions, total] = await Promise.all([
      MainsQuestion.find(filter)
        .populate('tags', '_id category subCategory topic tag')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-__v'),
      MainsQuestion.countDocuments(filter)
    ]);
    res.setHeader('Cache-Control', 'no-cache');
    res.json({
      questions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalQuestions: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch Mains questions');
  }
};

const createQuestion = async (req, res) => {
  try {
    const questionData = normalizeQuestion(req.body);
    const validationError = await validateQuestion(questionData);
    if (validationError) return res.status(400).json({ message: validationError });
    const question = await MainsQuestion.create({ ...questionData, createdBy: req.user._id });
    await question.populate('tags', '_id category subCategory topic tag');
    res.status(201).json({ message: 'Mains question created successfully.', question });
  } catch (error) {
    handleError(res, error, 'Failed to create Mains question');
  }
};

const updateQuestion = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid Mains question ID.' });
    }
    const questionData = normalizeQuestion(req.body);
    const validationError = await validateQuestion(questionData);
    if (validationError) return res.status(400).json({ message: validationError });
    const question = await MainsQuestion.findByIdAndUpdate(req.params.id, questionData, {
      new: true,
      runValidators: true
    }).populate('tags', '_id category subCategory topic tag').select('-__v');
    if (!question) return res.status(404).json({ message: 'Mains question not found.' });
    res.json({ message: 'Mains question updated successfully.', question });
  } catch (error) {
    handleError(res, error, 'Failed to update Mains question');
  }
};

const deleteQuestion = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid Mains question ID.' });
    }
    const question = await MainsQuestion.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ message: 'Mains question not found.' });
    res.json({ message: 'Mains question deleted successfully.' });
  } catch (error) {
    handleError(res, error, 'Failed to delete Mains question');
  }
};

const importQuestions = async (req, res) => {
  try {
    let questions;
    const files = req.files || [];
    if (files.length) {
      if (files.length !== 2 || files.some(file => !/\.docx$/i.test(file.originalname))) {
        return res.status(400).json({ message: 'Select both English and Hindi DOCX files.' });
      }

      const parsed = await Promise.all(files.map(file =>
        parseTheoryDocumentQuestions(file.buffer, file.originalname)
      ));
      const englishIndex = files.findIndex(file => /english|अंग्रेजी/i.test(file.originalname));
      const hindiIndex = files.findIndex(file => /hindi|हिंदी/i.test(file.originalname));
      if (englishIndex >= 0 && hindiIndex >= 0 && englishIndex === hindiIndex) {
        return res.status(400).json({ message: 'Name one file English and the other Hindi, or select English first and Hindi second.' });
      }
      let englishFileIndex = 0;
      let hindiFileIndex = 1;
      if (englishIndex >= 0 && hindiIndex >= 0) {
        englishFileIndex = englishIndex;
        hindiFileIndex = hindiIndex;
      } else if (englishIndex >= 0) {
        englishFileIndex = englishIndex;
        hindiFileIndex = 1 - englishIndex;
      } else if (hindiIndex >= 0) {
        hindiFileIndex = hindiIndex;
        englishFileIndex = 1 - hindiIndex;
      }
      const englishQuestions = parsed[englishFileIndex];
      const hindiQuestions = parsed[hindiFileIndex];
      if (englishQuestions.length !== hindiQuestions.length) {
        return res.status(400).json({
          message: `English and Hindi DOCX files must contain the same number of questions. Found ${englishQuestions.length} English and ${hindiQuestions.length} Hindi.`
        });
      }
      questions = englishQuestions.map((item, index) => ({
        question: {
          english: item.question.english,
          hindi: hindiQuestions[index].question.english
        },
        tags: []
      }));
    } else {
      questions = req.body.questions;
    }

    if (!Array.isArray(questions) || !questions.length || questions.length > 1000) {
      return res.status(400).json({ message: 'Provide between 1 and 1000 Mains questions.' });
    }
    const normalized = questions.map(normalizeQuestion);
    if (normalized.some(question => !hasQuestionText(question.question.english))) {
      return res.status(400).json({ message: 'English question text is required for every imported question.' });
    }
    const tagIds = [...new Set(normalized.flatMap(question => question.tags))];
    if (tagIds.some(id => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({ message: 'One or more selected Mains tags are invalid.' });
    }
    if (tagIds.length) {
      const tagsCount = await MainsTag.countDocuments({ _id: { $in: tagIds } });
      if (tagsCount !== tagIds.length) {
        return res.status(400).json({ message: 'One or more selected Mains tags do not exist.' });
      }
    }

    if (req.body.preview === 'true' || req.body.preview === true) {
      return res.json({ questions: normalized });
    }
    const documents = normalized.map(question => ({ ...question, createdBy: req.user._id }));
    const saved = await MainsQuestion.insertMany(documents, { ordered: true });
    return res.status(201).json({
      count: saved.length,
      message: `${saved.length} Mains questions imported successfully.`
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Unable to import Mains questions.' });
  }
};

module.exports = { getQuestions, createQuestion, updateQuestion, deleteQuestion, importQuestions };
