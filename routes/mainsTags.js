const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const {
  createTag,
  getTags,
  getCategories,
  updateTag,
  deleteTag
} = require('../controllers/mainsTagController');

router.use(auth, adminAuth);
router.get('/', getTags);
router.get('/categories', getCategories);
router.post('/', createTag);
router.put('/:id', updateTag);
router.delete('/:id', deleteTag);

module.exports = router;
