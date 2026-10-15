const mongoose = require('mongoose');

const mainsQuestionSchema = new mongoose.Schema({
  question: {
    english: {
      type: String,
      required: [true, 'English question text is required'],
      trim: true
    },
    hindi: {
      type: String,
      trim: true,
      default: ''
    }
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MainsTag'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

mainsQuestionSchema.index({ createdAt: -1 });
mainsQuestionSchema.index({ tags: 1 });

module.exports = mongoose.model('MainsQuestion', mainsQuestionSchema);
