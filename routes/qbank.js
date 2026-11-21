const express = require('express');
const Test = require('../models/Test');
const Question = require('../models/Question');
const QbankState = require('../models/QbankState');
const User = require('../models/User');

const router = express.Router();

const questionUid = (value) => {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  return value.uid || value.questionUid || value.id || String(value._id || '');
};

const parseDate = (date, time) => {
  if (!date) return null;
  const value = new Date(time && String(date).includes('T') === false ? `${String(date).slice(0, 10)}T${time}` : date);
  return Number.isNaN(value.getTime()) ? null : value;
};

const parseScheduleEnd = (date, startTime, duration, status) => {
  const parsed = parseDate(date);
  if (parsed) return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 23, 59, 59);
  if (status === 'live') return new Date('2099-12-31T23:59:59.999Z');
  if (!startTime) return null;
  return new Date(startTime.getTime() + duration * 60000);
};

router.get('/state', async (req, res, next) => {
  try {
    const saved = await QbankState.findOne().sort({ updatedAt: -1 });
    res.json(saved ? saved.state : null);
  } catch (error) {
    next(error);
  }
});

router.put('/state', async (req, res, next) => {
  try {
    await QbankState.findOneAndUpdate({}, { state: req.body }, { upsert: true, new: true });

    const tests = Array.isArray(req.body?.tests) ? req.body.tests : [];
    const questions = Array.isArray(req.body?.questions) ? req.body.questions : [];
    const admin = await User.findOne({ role: 'admin', isActive: { $ne: false } }).select('_id');
    if (!admin) return res.status(409).json({ success: false, message: 'No active admin user found for test synchronization.' });

    for (const question of questions) {
      if (!question?.id || question.deleted) continue;
      const englishOptions = Array.isArray(question.options)
        ? question.options.map((option) => typeof option === 'string' ? option : String(option?.en || option?.english || option || ''))
        : [];
      const hindiOptions = Array.isArray(question.hiOptions)
        ? question.hiOptions.map((option) => typeof option === 'string' ? option : String(option?.hi || option?.hindi || option || ''))
        : [];
      const options = [0, 1, 2, 3].map((index) => ({
        english: englishOptions[index] || `Option ${index + 1}`,
        hindi: hindiOptions[index] || ''
      }));
      await Question.findOneAndUpdate(
        { uid: String(question.id) },
        {
          uid: String(question.id),
          question: { english: String(question.en || `Question ${question.id}`), hindi: String(question.hi || '') },
          description: { english: String(question.explanation || '') , hindi: '' },
          options,
          correctAnswer: (() => {
            const parsed = Number(question.correct);
            return Number.isFinite(parsed) ? Math.max(0, Math.min(3, parsed)) : 0;
          })(),
          tags: [],
          isActive: !question.deleted,
          createdBy: admin._id
        },
        { upsert: true, new: true, runValidators: true }
      );
    }

    for (const item of tests) {
      const qbankKey = String(item._id || item.id || item.key || '');
      if (!qbankKey) continue;
      const qbankKind = String(item.kind || 'PRELIMS').toUpperCase() === 'MAINS' ? 'mains' : 'pre';

      const duration = Number(item.duration || item.minutes || 180) || 180;
      const startTime = parseDate(item.start || item.date || item.startDate || item.startTime, item.time);
      const endTime = parseScheduleEnd(item.end || item.endDate || item.endTime, startTime, duration, String(item.status || '').toLowerCase());
      const marksPerQuestion = Number(item.marksPerQ ?? item.marksPerQuestion ?? 2) || 0;
      const questionIds = Array.isArray(item.questionIds) ? item.questionIds : [];

      const payload = {
        title: String(item.name || item.title || 'Prelims Test'),
        description: String(item.description || ''),
        startTime: startTime || new Date(),
        endTime: endTime || new Date((startTime || new Date()).getTime() + duration * 60000),
        duration,
        marksPerQuestion,
        negativeMarks: Number(item.negMarks ?? item.negativeMarks ?? 0) || 0,
        questionUids: questionIds.map(questionUid).filter(Boolean),
        introPage: String(item.intro || item.introPage || ''),
        introPageHi: String(item.introHi || item.introPageHi || ''),
        isActive: String(item.status || 'live').toLowerCase() === 'live',
        createdBy: admin._id,
        qbankKey,
        qbankKind
      };

      await Test.findOneAndUpdate({ qbankKey }, payload, { upsert: true, new: true, runValidators: true });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
