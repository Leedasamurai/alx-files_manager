import Bull from 'bull';
import Jimp from 'jimp';
import path from 'path';
import fs from 'fs';
import dbClient from './utils/db';

const fileQueue = new Bull('fileQueue', {
  redis: {
    host: 'localhost',
    port: 6379,
  },
});

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  if (!userId) {
    throw new Error('Missing userId');
  }

  const file = await dbClient.db.collection('files').findOne({
    _id: fileId,
    userId,
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

console.log('Worker is running...');
