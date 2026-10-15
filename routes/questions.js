const express = require('express');
const router = express.Router();
const {
  createQuestions,
  getQuestions,
  getQuestionByUid,
  getQuestionsByTag,
  updateQuestion,
  deleteQuestion,
  getAllQuestions
} = require('../controllers/questionController');
const { auth, adminAuth } = require('../middleware/auth');
const importUpload = require('multer')({ storage: require('multer').memoryStorage(), limits: { fileSize: 20 * 1024 * 1024, files: 2 } }).array('file', 2);
router.post('/import', auth, adminAuth, (req, res, next) => {
  importUpload(req, res, error => {
    if (error) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'Each import file must be 20 MB or smaller.'
        : error.message;
      return res.status(400).json({ success: false, message });
    }
    next();
  });
}, require('../controllers/questionImportController').importQuestions);
router.post('/import-sheet', auth, adminAuth, require('../controllers/questionImportController').importFromSheet);

router.get('/', auth, adminAuth, getQuestions);
router.get('/all', auth, adminAuth, getAllQuestions);

router.get('/:uid', auth, adminAuth, getQuestionByUid);
router.get('/tag/:tagId', auth, adminAuth, getQuestionsByTag);

router.post('/', auth, adminAuth, createQuestions);
router.put('/:uid', auth, adminAuth, updateQuestion);
router.delete('/:uid', auth, adminAuth, deleteQuestion);

module.exports = router;
