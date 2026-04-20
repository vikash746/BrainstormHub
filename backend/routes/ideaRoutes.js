const express = require('express');
const multer = require('multer');
const path = require('path');
const Idea = require('../models/Idea');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb){
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Get ideas by session id (with sorting)
router.get('/session/:sessionId', authMiddleware, async (req, res) => {
  let sortQuery = { votes: -1 };
  if (req.query.sort === 'newest') sortQuery = { createdAt: -1 };
  if (req.query.sort === 'trending') sortQuery = { updatedAt: -1, votes: -1 };

  try {
    const ideas = await Idea.find({ sessionId: req.params.sessionId }).sort(sortQuery);
    res.json(ideas);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add idea with tags, attachments
router.post('/session/:sessionId', authMiddleware, upload.array('attachments', 3), async (req, res) => {
  const { title, description, category, tags } = req.body;
  const attachments = req.files ? req.files.map(f => f.path) : [];
  try {
    const idea = new Idea({
      sessionId: req.params.sessionId,
      title,
      description,
      category,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      attachments
    });
    await idea.save();
    req.app.get('io').to(req.params.sessionId).emit('new-idea', idea);
    res.status(201).json(idea);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Vote idea
router.post('/:ideaId/vote', authMiddleware, async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.ideaId);
    if (!idea) return res.status(404).json({ error: 'Idea not found' });
    if (idea.voters.includes(req.user.id)) return res.status(400).json({ error: 'User already voted for this idea' });

    idea.voters.push(req.user.id);
    idea.votes += 1;
    await idea.save();
    req.app.get('io').to(idea.sessionId.toString()).emit('vote-update', { ideaId: idea._id, votes: idea.votes });
    res.json(idea);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update status (Admin/Mod only)
router.put('/:ideaId/status', authMiddleware, async (req, res) => {
  if (req.user.role === 'Member') return res.status(403).json({ error: 'Forbidden' });
  const { status } = req.body;
  try {
    const idea = await Idea.findByIdAndUpdate(req.params.ideaId, { status }, { new: true });
    req.app.get('io').to(idea.sessionId.toString()).emit('status-update', idea);
    res.json(idea);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
