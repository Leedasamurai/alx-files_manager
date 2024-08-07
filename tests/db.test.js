import { dbClient } from '../db';

describe('DB Client', () => {
  it('should connect to the database', async () => {
    const connection = await dbClient.connect();
    expect(connection).toBeDefined();
  });
});
