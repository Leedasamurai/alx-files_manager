import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

export async function postUpload(req, res) {
  const token = req.headers['x-token'];
  const { name, type, parentId = 0, isPublic = false, data } = req.body;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!name) {
    return res.status(400).json({ error: 'Missing name' });
  }

  const validTypes = ['folder', 'file', 'image'];
  if (!type || !validTypes.includes(type)) {
    return res.status(400).json({ error: 'Missing type' });
  }

  if (type !== 'folder' && !data) {
    return res.status(400).json({ error: 'Missing data' });
  }

  const parentFile = parentId !== 0 ? await dbClient.db.collection('files').findOne({ _id: ObjectId(parentId) }) : null;
  if (parentId !== 0 && !parentFile) {
    return res.status(400).json({ error: 'Parent not found' });
  }
  if (parentFile && parentFile.type !== 'folder') {
    return res.status(400).json({ error: 'Parent is not a folder' });
  }

  const newFile = {
    userId: ObjectId(userId),
    name,
    type,
    isPublic,
    parentId: parentId === 0 ? 0 : ObjectId(parentId),
  };

  if (type === 'folder') {
    const result = await dbClient.db.collection('files').insertOne(newFile);
    return res.status(201).json({ id: result.insertedId, ...newFile });
  } else {
    if (!fs.existsSync(FOLDER_PATH)) {
      fs.mkdirSync(FOLDER_PATH, { recursive: true });
    }

    const localPath = path.join(FOLDER_PATH, uuidv4());
    fs.writeFileSync(localPath, Buffer.from(data, 'base64'));

    newFile.localPath = localPath;

    const result = await dbClient.db.collection('files').insertOne(newFile);
    return res.status(201).json({ id: result.insertedId, ...newFile });
  }
}

export async function putPublish(req, res) {
  const token = req.headers['x-token'];
  const { id } = req.params;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(id), userId: ObjectId(userId) });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    const updatedFile = await dbClient.db.collection('files').findOneAndUpdate(
      { _id: ObjectId(id) },
      { $set: { isPublic: true } },
      { returnOriginal: false }
    );

    return res.status(200).json(updatedFile.value);
  } catch (error) {
    console.error('Error in putPublish:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function putUnpublish(req, res) {
  const token = req.headers['x-token'];
  const { id } = req.params;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(id), userId: ObjectId(userId) });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    const updatedFile = await dbClient.db.collection('files').findOneAndUpdate(
      { _id: ObjectId(id) },
      { $set: { isPublic: false } },
      { returnOriginal: false }
    );

    return res.status(200).json(updatedFile.value);
  } catch (error) {
    console.error('Error in putUnpublish:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
