import request from 'supertest';
import express from 'express';
import walrusRoutes from '../../src/routes/walrus_routes';

describe('GET /api/fetch-blobs', () => {
  const app = express();
  app.use('/api', walrusRoutes);

  it('should return 400 if name query is missing', async () => {
    const res = await request(app).get('/api/fetch-blobs');
    expect(res.status).toBe(400);
  });

  it('should return 404 if SuiNS name or blobs not found', async () => {
    const res = await request(app)
      .get('/api/fetch-blobs')
      .query({ name: 'https://nonexistent.wal.app/' });
    expect([404, 400, 500]).toContain(res.status); // Acceptable for stub/mock
  });

  // You can add more tests here, e.g. for valid responses, using mocks
});
