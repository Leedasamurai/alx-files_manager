import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';
import sha1 from 'sha1';

export async function getConnect(req, res) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const [email, password] = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
  const hashedPassword = sha1(password);

  try {
    const user = await dbClient.db.collection('users').findOne({ email, password: hashedPassword });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = uuidv4();
    await redisClient.set(token, user._id.toString(), 24 * 60 * 60);

    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getDisconnect(req, res) {
  const token = req.headers['x-token'];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const userId = await redisClient.get(token);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await redisClient.del(token);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
