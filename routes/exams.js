const express = require('express');
const router = express.Router();
const {
  getExams,
  getAdminExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam
} = require('../controllers/examController');
const { auth, adminAuth } = require('../middleware/auth');

router.get('/', getExams);
router.get('/admin/all', auth, adminAuth, getAdminExams);
router.post('/admin', auth, adminAuth, createExam);
router.get('/admin/:id', auth, adminAuth, getExamById);
router.put('/admin/:id', auth, adminAuth, updateExam);
router.delete('/admin/:id', auth, adminAuth, deleteExam);

module.exports = router;
