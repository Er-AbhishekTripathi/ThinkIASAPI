const express = require('express');
const router = express.Router();
const {
  createTest,
  getTests,
  updateTest,
  deleteTest,
  getTestResults,
  getTestAnalytics,
  getAllResults,
  getPlatformStatistics,
  getDashboardCharts,
  getStudents,
  updateUserType,
  getUsersByType,
  deleteUser,
  reopenExam
} = require('../controllers/adminController');
const { auth, adminAuth } = require('../middleware/auth');
const { testValidation, handleValidationErrors } = require('../middleware/validation');
const { apiLimiter } = require('../middleware/rateLimiter');

router.use(auth, adminAuth, apiLimiter);

// Test Management
router.post('/tests', testValidation, handleValidationErrors, createTest);
router.get('/tests', getTests);
router.put('/tests/:id', testValidation, updateTest);
router.delete('/tests/:id', deleteTest);
router.post('/tests/:id/reopen', reopenExam);

// Results & Analytics
router.get('/results/:testId', getTestResults);
router.get('/analytics/:testId', getTestAnalytics);
router.get('/results', getAllResults);
router.get('/statistics', getPlatformStatistics);
router.get('/dashboard-charts', getDashboardCharts);

// Student Management
router.get('/students', getStudents);
router.patch('/students/:id/status', async (req, res) => {
  try {
    if (typeof req.body.isActive !== 'boolean') return res.status(400).json({ message: 'isActive must be a boolean.' });
    const student = await require('../models/User').findOneAndUpdate(
      { _id: req.params.id, role: 'student' }, { $set: { isActive: req.body.isActive } },
      { new: true, runValidators: true }
    ).select('fullName isActive');
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    res.json({ success: true, data: student });
  } catch (error) { res.status(400).json({ message: error.message }); }
});
router.patch('/students/:id/block', async (req, res) => {
  try {
    if (typeof req.body.isBlocked !== 'boolean') return res.status(400).json({ message: 'isBlocked must be a boolean.' });
    const student = await require('../models/User').findOneAndUpdate(
      { _id: req.params.id, role: 'student' }, { $set: { isBlocked: req.body.isBlocked } },
      { new: true, runValidators: true }
    ).select('fullName isBlocked');
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    res.json({ success: true, data: student });
  } catch (error) { res.status(400).json({ message: error.message }); }
});
router.patch('/students/:id/profile', async (req, res) => {
  const { fullName, email, phone } = req.body;
  if ([fullName, email, phone].some(value => typeof value !== 'string' || !value.trim())) {
    return res.status(400).json({ message: 'Name, email, and phone are required.' });
  }

  try {
    const User = require('../models/User');
    const student = await User.findOne({ _id: req.params.id, role: 'student' });
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    student.fullName = fullName.trim();
    student.email = email.trim().toLowerCase();
    student.phone = phone.trim();
    await student.save();

    res.json({
      success: true,
      data: {
        _id: student._id,
        fullName: student.fullName,
        email: student.email,
        phone: student.phone
      }
    });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'This email is already in use.' });
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    console.error('Unable to update student profile:', error);
    res.status(500).json({ message: 'Unable to update student profile.' });
  }
});
router.get('/students/:id', async (req, res) => {
  try {
    const student = await require('../models/User').findOne({ _id: req.params.id, role: 'student' }).select('isActive isBlocked purchasedPlanId programId batchId fullName email phone role type createdAt updatedAt planActivatedAt planExpiryAt').lean();
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    res.json({ success: true, data: student });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
});
router.delete('/users/:id', auth, adminAuth, deleteUser);

// User Management Routes
router.put('/users/:userId/type', updateUserType);
router.get('/users', getUsersByType);

module.exports = router;
