const mongoose = require('mongoose');

const ideaSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String },
  tags: [{ type: String }],
  status: { type: String, enum: ['Under Review', 'Approved', 'Rejected'], default: 'Under Review' },
  attachments: [{ type: String }],
  votes: { type: Number, default: 0 },
  voters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Idea', ideaSchema);
