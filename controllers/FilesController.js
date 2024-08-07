const { v4: uuidv4 } = require('uuid');
const { db } = require('../utils/db');
const redisClient = require('../utils/redis');
const fs = require('fs');
const path = require('path');

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const userId = await redisClient.get(`auth_${token}`);

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name, type, parentId = 0, isPublic = false, data } = req.body;

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

      if (parentId !== 0) {
        const parentFile = await db.collection('files').findOne({ _id: parentId });

        if (!parentFile) {
          return res.status(400).json({ error: 'Parent not found' });
        }

        if (parentFile.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
      }

      const fileData = {
        userId: userId,
        name,
        type,
        isPublic,
        parentId,
      };

      if (type === 'folder') {
        const result = await db.collection('files').insertOne(fileData);
        const newFile = result.ops[0];
        return res.status(201).json({
          id: newFile._id.toString(),
          userId: newFile.userId,
          name: newFile.name,
          type: newFile.type,
          isPublic: newFile.isPublic,
          parentId: newFile.parentId,
        });
      }

      const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
      if (!fs.existsSync(FOLDER_PATH)) {
        fs.mkdirSync(FOLDER_PATH, { recursive: true });
      }

      const fileUuid = uuidv4();
      const filePath = path.join(FOLDER_PATH, fileUuid);
      const fileBuffer = Buffer.from(data, 'base64');
      fs.writeFileSync(filePath, fileBuffer);

      fileData.localPath = filePath;
      const result = await db.collection('files').insertOne(fileData);
      const newFile = result.ops[0];

      return res.status(201).json({
        id: newFile._id.toString(),
        userId: newFile.userId,
        name: newFile.name,
        type: newFile.type,
        isPublic: newFile.isPublic,
        parentId: newFile.parentId,
        localPath: newFile.localPath,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

module.exports = FilesController;
