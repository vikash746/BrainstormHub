const express = require('express');
const Idea = require('../models/Idea');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const topIdeas = await Idea.find().sort({ votes: -1 }).limit(5);
    
    // Category popularity
    const categoryPopularity = await Idea.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Most active users (by number of ideas generated)
    const activeUsers = await Idea.aggregate([
      { $group: { _id: "$createdBy", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const totalVotesResult = await Idea.aggregate([
      { $group: { _id: null, totalVotes: { $sum: "$votes" } } }
    ]);
    const totalVotes = totalVotesResult.length > 0 ? totalVotesResult[0].totalVotes : 0;

    res.json({
      topIdeas,
      categoryPopularity,
      totalVotes,
      activeUsers
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
