const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

const getStatus = async (req, res) => {
  try {
    // Check Redis
    redisClient.ping((err, response) => {
      if (err || response !== 'PONG') {
        return res.status(500).json({ redis: false, db: true });
      }

      // Check MongoDB
      dbClient.db.admin().ping({}, (err, result) => {
        if (err || result !== 'ok') {
          return res.status(500).json({ redis: true, db: false });
        }

        res.status(200).json({ redis: true, db: true });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getStats = async (req, res) => {
  try {
    const usersCount = await dbClient.db.collection('users').countDocuments();
    const filesCount = await dbClient.db.collection('files').countDocuments();
    res.status(200).json({ users: usersCount, files: filesCount });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getStatus,
  getStats,
};
