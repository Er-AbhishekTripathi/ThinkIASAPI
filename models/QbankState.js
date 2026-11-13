const mongoose = require('mongoose');

const qbankStateSchema = new mongoose.Schema({
  state: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true });

module.exports = mongoose.model('QbankState', qbankStateSchema);
