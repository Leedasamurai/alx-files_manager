import { MongoClient } from 'mongodb';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 27017;
const DB_DATABASE = process.env.DB_DATABASE || 'files_manager';
const url = `mongodb://${DB_HOST}:${DB_PORT}`;

class DBClient {
  constructor() {
    this.db = null;
    this.connect();
  }

  async connect() {
    try {
      const client = await MongoClient.connect(url, { useUnifiedTopology: true });
      console.log('Connected successfully to server');
      this.db = client.db(DB_DATABASE);
    } catch (err) {
      console.error('MongoDB connection error:', err.message);
      this.db = null;
    }
  }

  isAlive() {
    return Boolean(this.db);
  }

  async nbUsers() {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    const numberOfUsers = await this.db.collection('users').countDocuments();
    return numberOfUsers;
  }

  async nbFiles() {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    const numberOfFiles = await this.db.collection('files').countDocuments();
    return numberOfFiles;
  }
}

const dbClient = new DBClient();
export default dbClient;
