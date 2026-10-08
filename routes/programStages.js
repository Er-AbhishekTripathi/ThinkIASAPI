const express = require('express');
const router = express.Router();
const {
  getProgramStages,
  getAdminProgramStages,
  createProgramStage,
  updateProgramStage,
  deleteProgramStage
} = require('../controllers/programStageController');
const { auth, adminAuth } = require('../middleware/auth');

router.get('/', getProgramStages);
router.get('/admin/all', auth, adminAuth, getAdminProgramStages);
router.post('/admin', auth, adminAuth, createProgramStage);
router.put('/admin/:id', auth, adminAuth, updateProgramStage);
router.delete('/admin/:id', auth, adminAuth, deleteProgramStage);

module.exports = router;
