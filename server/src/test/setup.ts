import fs from 'fs';
import path from 'path';
import { beforeAll, afterAll } from 'vitest';

const testDataDir = path.join(__dirname, '..', '..', 'test-data');
const testDbPath = path.join(testDataDir, 'test-marathon.db');

beforeAll(() => {
  process.env.DB_DIR = testDataDir;
  process.env.DB_PATH = testDbPath;
  process.env.JWT_SECRET = 'test-secret-key';

  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  const walPath = testDbPath + '-wal';
  const shmPath = testDbPath + '-shm';
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
});

afterAll(() => {
  if (fs.existsSync(testDbPath)) {
    try { fs.unlinkSync(testDbPath); } catch (_) { /* ignore */ }
  }
  const walPath = testDbPath + '-wal';
  const shmPath = testDbPath + '-shm';
  if (fs.existsSync(walPath)) try { fs.unlinkSync(walPath); } catch (_) { /* ignore */ }
  if (fs.existsSync(shmPath)) try { fs.unlinkSync(shmPath); } catch (_) { /* ignore */ }
  if (fs.existsSync(testDataDir)) {
    try { fs.rmdirSync(testDataDir); } catch (_) { /* ignore */ }
  }
});
