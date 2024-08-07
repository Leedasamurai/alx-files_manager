const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const dbClient = require('../utils/db'); // Ensure this path is correct
const redisClient = require('../utils/redis');

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    try {
      const db = dbClient.db; // Access the MongoDB database
      if (!db) {
        console.log('Database connection is not available');
        return res.status(500).json({ error: 'Database connection not available' });
      }

      const existingUser = await db.collection('users').findOne({ email });

      if (existingUser) {
        return res.status(400).json({ error: 'Already exist' });
      }

      const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

      const result = await db.collection('users').insertOne({ email, password: hashedPassword });

      const newUser = { _id: result.insertedId, email };
      return res.status(201).json({ id: newUser._id.toString(), email: newUser.email });
    } catch (error) {
      console.error('Error in UsersController.postNew:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const userId = await redisClient.get(`auth_${token}`);

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const db = dbClient.db; // Access the MongoDB database
      if (!db) {
        console.log('Database connection is not available');
        return res.status(500).json({ error: 'Database connection not available' });
      }

      const user = await db.collection('users').findOne({ _id: ObjectId(userId) });

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      return res.status(200).json({ id: user._id.toString(), email: user.email });
    } catch (err) {
      console.error('Error in UsersController.getMe:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

module.exports = UsersController;
