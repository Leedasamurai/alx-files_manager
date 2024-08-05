// controllers/AppController.js
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

const getStatus = async (req, res) => {
    try {
        // Check Redis status
        const redisStatus = await new Promise((resolve, reject) => {
            redisClient.ping((err, reply) => {
                if (err) return reject(err);
                resolve(reply === 'PONG');
            });
        });

        // Check DB status
        const dbStatus = await dbClient.collection('test').findOne();

        res.status(200).json({ redis: redisStatus, db: !!dbStatus });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getStats = async (req, res) => {
    try {
        const usersCount = await dbClient.collection('users').countDocuments();
        const filesCount = await dbClient.collection('files').countDocuments();

        res.status(200).json({ users: usersCount, files: filesCount });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getStatus,
    getStats
};
