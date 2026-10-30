const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const {
  getQuestions,
  getAllQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  deleteAllQuestions,
  importQuestions
} = require('../controllers/mainsQuestionController');
const importUpload = require('multer')({
  storage: require('multer').memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 2 }
}).array('file', 2);

router.use(auth, adminAuth);
router.get('/all', getAllQuestions);
router.post('/import', importUpload, importQuestions);
router.get('/', getQuestions);
router.post('/', createQuestion);
router.put('/:id', updateQuestion);
router.delete('/', deleteAllQuestions);
router.delete('/:id', deleteQuestion);

module.exports = router;
