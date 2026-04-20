const express = require('express');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/idea/:ideaId', authMiddleware, async (req, res) => {
  try {
    const comments = await Comment.find({ ideaId: req.params.ideaId }).populate('userId', 'name').sort({ createdAt: 1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/idea/:ideaId', authMiddleware, async (req, res) => {
  const { content, parentId } = req.body;
  try {
    const comment = new Comment({
      ideaId: req.params.ideaId,
      userId: req.user.id,
      content,
      parentId: parentId || null
    });
    await comment.save();
    await comment.populate('userId', 'name');

    // Mentions logic
    const mentionRegex = /@(\w+)/g;
    const mentions = content.match(mentionRegex);
    if (mentions) {
      for (const mention of mentions) {
        const username = mention.substring(1);
        const mentionedUser = await User.findOne({ name: new RegExp('^' + username + '$', 'i') });
        if (mentionedUser) {
          const notif = new Notification({
            userId: mentionedUser._id,
            message: `${req.user.name} mentioned you in a comment.`
          });
          await notif.save();
          // Emit via socket
          req.app.get('io').to(`user-${mentionedUser._id}`).emit('notification', notif);
        }
      }
    }

    req.app.get('io').to(req.params.ideaId).emit('new-comment', comment);

    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
