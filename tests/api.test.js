import request from 'supertest';
import app from '../server';

describe('API Endpoints', () => {
  it('should get status', async () => {
    const response = await request(app).get('/status');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
  });

  it('should get stats', async () => {
    const response = await request(app).get('/stats');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('stats');
  });

  it('should create a user', async () => {
    const response = await request(app).post('/users').send({ username: 'testuser', password: 'testpass' });
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('user');
  });

  it('should sign in a user', async () => {
    const response = await request(app).get('/connect').set('Authorization', 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });

  it('should sign out a user', async () => {
    const response = await request(app).get('/disconnect').set('X-Token', 'some-token');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
  });

  it('should get user info', async () => {
    const response = await request(app).get('/users/me').set('X-Token', 'some-token');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('user');
  });

  it('should upload a file', async () => {
    const response = await request(app).post('/files').attach('file', 'path/to/file.png');
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('file');
  });

  it('should get file by id', async () => {
    const response = await request(app).get('/files/1234');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('file');
  });

  it('should get all files with pagination', async () => {
    const response = await request(app).get('/files').query({ page: 1, limit: 10 });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('files');
  });

  it('should publish a file', async () => {
    const response = await request(app).put('/files/1234/publish').set('X-Token', 'some-token');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('file');
  });

  it('should unpublish a file', async () => {
    const response = await request(app).put('/files/1234/unpublish').set('X-Token', 'some-token');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('file');
  });

  it('should get file data', async () => {
    const response = await request(app).get('/files/1234/data');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/image/);
  });

  it('should get file data with size', async () => {
    const response = await request(app).get('/files/1234/data?size=100');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/image/);
  });
});
