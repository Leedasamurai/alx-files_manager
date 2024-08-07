const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { connectToDatabase } = require('../utils/db');
const redisClient = require('../utils/redis');

const getConnect = async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
  const [email, password] = credentials.split(':');

  if (!email || !password) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const db = await connectToDatabase();
    const collection = db.collection('users');

    // Hash the password and find the user
    const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');
    const user = await collection.findOne({ email, password: hashedPassword });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Generate token and store in Redis
    const token = uuidv4();
    await redisClient.setex(`auth_${token}`, 24 * 60 * 60, user._id.toString());

    res.status(200).json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getDisconnect = async (req, res) => {
  const token = req.headers['x-token'];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await redisClient.del(`auth_${token}`);

    if (result === 0) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getConnect,
  getDisconnect,
};
