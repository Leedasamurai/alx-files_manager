import Redis from 'ioredis-mock';
import { redisClient } from '../redisClient';

describe('Redis Client', () => {
  let client;

  beforeAll(() => {
    client = new Redis();
  });

  it('should set and get a value', async () => {
    await client.set('key', 'value');
    const result = await client.get('key');
    expect(result).toBe('value');
  });

  it('should delete a value', async () => {
    await client.set('key', 'value');
    await client.del('key');
    const result = await client.get('key');
    expect(result).toBe(null);
  });
});
