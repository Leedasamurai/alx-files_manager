import { ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import Jimp from 'jimp';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import Bull from 'bull';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
const fileQueue = new Bull('fileQueue', {
  redis: {
    host: 'localhost',
    port: 6379,
  },
});

// Process image thumbnails in the background
fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  if (!userId) {
    throw new Error('Missing userId');
  }

  const file = await dbClient.db.collection('files').findOne({
    _id: ObjectId(fileId),
    userId: ObjectId(userId),
  });

  if (!file) {
    throw new Error('File not found');
  }

  if (file.type !== 'image') {
    throw new Error('Invalid file type');
  }

  const sizes = [100, 250, 500];
  await Promise.all(sizes.map(async (size) => {
    const thumbnailPath = `${file.localPath}_${size}`;
    const image = await Jimp.read(file.localPath);
    await image.resize(size, Jimp.AUTO).writeAsync(thumbnailPath);
  }));
});

export async function postUpload(req, res) {
  const { userId } = req.body; // Make sure to validate and sanitize input
  const file = req.file; // Assuming file is uploaded using middleware like multer

  if (!userId || !file) {
    return res.status(400).json({ error: 'Missing userId or file' });
  }

  // Store file metadata in the database
  const fileId = new ObjectId();
  await dbClient.db.collection('files').insertOne({
    _id: fileId,
    userId: ObjectId(userId),
    name: file.originalname,
    type: file.mimetype.split('/')[0],
    localPath: path.join(FOLDER_PATH, file.filename),
    isPublic: false,
    parentId: null,
  });

  // Add a job to generate thumbnails for the image
  fileQueue.add({ fileId, userId });

  res.status(201).json({ fileId });
}

export async function getFile(req, res) {
  const { id } = req.params;
  const { size } = req.query;

  if (size && ![100, 250, 500].includes(Number(size))) {
    return res.status(400).json({ error: 'Invalid size query parameter' });
  }

  const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(id) });

  if (!file) {
    return res.status(404).json({ error: 'Not found' });
  }

  if (!file.isPublic && !req.headers['x-token']) {
    return res.status(404).json({ error: 'Not found' });
  }

  if (file.type === 'folder') {
    return res.status(400).json({ error: "A folder doesn't have content" });
  }

  const filePath = size ? `${file.localPath}_${size}` : file.localPath;

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Not found' });
  }

  const mimeType = require('mime-types').lookup(filePath);
  res.setHeader('Content-Type', mimeType);
  res.sendFile(path.resolve(filePath));
}

export async function putPublish(req, res) {
  const { id } = req.params;
  // Implementation of putPublish
  await dbClient.db.collection('files').updateOne(
    { _id: ObjectId(id) },
    { $set: { isPublic: true } }
  );
  res.status(200).json({ id });
}

export async function putUnpublish(req, res) {
  const { id } = req.params;
  // Implementation of putUnpublish
  await dbClient.db.collection('files').updateOne(
    { _id: ObjectId(id) },
    { $set: { isPublic: false } }
  );
  res.status(200).json({ id });
}
