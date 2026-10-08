const mongoose = require('mongoose');

const programStageSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9][a-z0-9-]{0,79}$/
  },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  nameHindi: { type: String, trim: true, default: '' },
  displayOrder: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

programStageSchema.index({ isActive: 1, displayOrder: 1 });

module.exports = mongoose.model('ProgramStage', programStageSchema);
