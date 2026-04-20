const express = require('express');
const Session = require('../models/Session');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Create session
router.post('/', authMiddleware, async (req, res) => {
  const { title, description, category } = req.body;
  try {
    const session = new Session({ title, description, category: category || 'General', createdBy: req.user.id });
    await session.save();
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all sessions
router.get('/', authMiddleware, async (req, res) => {
  try {
    const sessions = await Session.find().populate('createdBy', 'name email').sort({ date: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single session
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).populate('createdBy', 'name email');
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
