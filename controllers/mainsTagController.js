const mongoose = require('mongoose');
const MainsTag = require('../models/MainsTag');
const { handleError } = require('../middleware/errorHandler');

const normalizeTagFields = ({ category, subCategory, topic, types } = {}) => ({
  category: typeof category === 'string' ? category.trim().toLowerCase() : '',
  subCategory: typeof subCategory === 'string' ? subCategory.trim().toLowerCase() : '',
  topic: typeof topic === 'string' ? topic.trim().toLowerCase() : '',
  types: typeof types === 'string' ? types.trim().toLowerCase() : ''
});

const createTag = async (req, res) => {
  try {
    const fields = normalizeTagFields(req.body);
    if (!fields.category || !fields.subCategory || !fields.topic || !fields.types) {
      return res.status(400).json({ message: 'Category, sub-category, topic, and types are required.' });
    }
    const tagPath = `${fields.types}/${fields.category}/${fields.subCategory}/${fields.topic}`;
    if (await MainsTag.exists({ tag: tagPath })) {
      return res.status(409).json({ message: 'Mains tag already exists.' });
    }
    const tag = await MainsTag.create({ ...fields, createdBy: req.user._id });
    res.status(201).json({ message: 'Mains tag created successfully.', tag });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Mains tag already exists.' });
    handleError(res, error, 'Failed to create Mains tag');
  }
};

const getTags = async (req, res) => {
  try {
    const tags = await MainsTag.find()
      .select('_id category subCategory topic types tag')
      .sort({ category: 1, subCategory: 1, topic: 1 });
    res.json(tags);
  } catch (error) {
    handleError(res, error, 'Failed to fetch Mains tags');
  }
};

const getCategories = async (req, res) => {
  try {
    res.json((await MainsTag.distinct('category')).sort());
  } catch (error) {
    handleError(res, error, 'Failed to fetch Mains tag categories');
  }
};

const updateTag = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid Mains tag ID.' });
    }
    const fields = normalizeTagFields(req.body);
    if (!fields.category || !fields.subCategory || !fields.topic || !fields.types) {
      return res.status(400).json({ message: 'Category, sub-category, topic, and types are required.' });
    }
    const tagPath = `${fields.types}/${fields.category}/${fields.subCategory}/${fields.topic}`;
    if (await MainsTag.exists({ tag: tagPath, _id: { $ne: req.params.id } })) {
      return res.status(409).json({ message: 'A Mains tag with this path already exists.' });
    }
    const tag = await MainsTag.findByIdAndUpdate(req.params.id, fields, {
      new: true,
      runValidators: true
    }).select('_id category subCategory topic types tag');
    if (!tag) return res.status(404).json({ message: 'Mains tag not found.' });
    res.json({ message: 'Mains tag updated successfully.', tag });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Mains tag already exists.' });
    handleError(res, error, 'Failed to update Mains tag');
  }
};

const deleteTag = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid Mains tag ID.' });
    }
    const MainsQuestion = require('../models/MainsQuestion');
    if (await MainsQuestion.exists({ tags: req.params.id })) {
      return res.status(409).json({ message: 'Remove this tag from Mains questions before deleting it.' });
    }
    const tag = await MainsTag.findByIdAndDelete(req.params.id);
    if (!tag) return res.status(404).json({ message: 'Mains tag not found.' });
    res.json({ message: 'Mains tag deleted successfully.' });
  } catch (error) {
    handleError(res, error, 'Failed to delete Mains tag');
  }
};

module.exports = { createTag, getTags, getCategories, updateTag, deleteTag };
