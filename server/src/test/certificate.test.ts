import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createApp } from '../index';
import { getDatabase, closeDatabase } from '../db';
import { JWT_SECRET } from '../middleware/auth';

const app = createApp();

describe('POST /api/registrations/:id/certificate - 完赛证书上传', () => {
  let userId: number;
  let token: string;
  let registrationId: number;

  beforeAll(() => {
    const db = getDatabase();

    const hash = bcrypt.hashSync('testpass123', 10);
    const userResult = db.prepare(
      'INSERT INTO users (username, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)'
    ).run('testuser_cert', 'testcert@example.com', hash, 'user', '13900000000');
    userId = Number(userResult.lastInsertRowid);

    token = jwt.sign({ userId, role: 'user' }, JWT_SECRET, { expiresIn: '1h' });

    const now = new Date();
    const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const pastDeadline = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const eventResult = db.prepare(`
      INSERT INTO events (name, city, date, route_description, start_point, end_point, cutoff_time, fee, supplies, status, image_url, registration_deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      '测试已结束马拉松',
      '测试城市',
      pastDate.toISOString().split('T')[0],
      '测试路线',
      '起点',
      '终点',
      '6小时',
      100,
      '测试物资',
      'finished',
      '',
      pastDeadline.toISOString().split('T')[0]
    );
    const eventId = Number(eventResult.lastInsertRowid);

    const projectResult = db.prepare(
      'INSERT INTO event_projects (event_id, name, distance, max_participants, current_count) VALUES (?, ?, ?, ?, ?)'
    ).run(eventId, 'full', 42.195, 100, 1);
    const projectId = Number(projectResult.lastInsertRowid);

    const regResult = db.prepare(`
      INSERT INTO registrations (user_id, event_id, project_id, emergency_contact, emergency_phone, bib_number, payment_status)
      VALUES (?, ?, ?, ?, ?, ?, 'paid')
    `).run(userId, eventId, projectId, '紧急联系人', '13800000000', 'F0100001');
    registrationId = Number(regResult.lastInsertRowid);
  });

  it('空字符串 certificate_url 应该返回 400', async () => {
    const res = await request(app)
      .post(`/api/registrations/${registrationId}/certificate`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        certificate_url: '',
        finish_time: '3:45:30',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('请填写完赛成绩和证书链接');
  });

  it('空字符串 finish_time 应该返回 400', async () => {
    const res = await request(app)
      .post(`/api/registrations/${registrationId}/certificate`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        certificate_url: 'https://example.com/cert.pdf',
        finish_time: '',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('请填写完赛成绩和证书链接');
  });

  it('空格 certificate_url 应该被 trim 后判空返回 400', async () => {
    const res = await request(app)
      .post(`/api/registrations/${registrationId}/certificate`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        certificate_url: '   ',
        finish_time: '3:45:30',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('请填写完赛成绩和证书链接');
  });

  it('空格 finish_time 应该被 trim 后判空返回 400', async () => {
    const res = await request(app)
      .post(`/api/registrations/${registrationId}/certificate`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        certificate_url: 'https://example.com/cert.pdf',
        finish_time: '   ',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('请填写完赛成绩和证书链接');
  });

  it('正常提交，两端都含空格时应该 trim 后入库', async () => {
    const rawCertUrl = '  https://example.com/my-certificate.pdf  ';
    const rawFinishTime = '  3:45:30  ';
    const expectedCertUrl = rawCertUrl.trim();
    const expectedFinishTime = rawFinishTime.trim();

    const res = await request(app)
      .post(`/api/registrations/${registrationId}/certificate`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        certificate_url: rawCertUrl,
        finish_time: rawFinishTime,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe('上传成功');

    const db = getDatabase();
    const reg = db.prepare(
      'SELECT certificate_url, finish_time FROM registrations WHERE id = ?'
    ).get(registrationId) as { certificate_url: string; finish_time: string };

    expect(reg.certificate_url).toBe(expectedCertUrl);
    expect(reg.finish_time).toBe(expectedFinishTime);
  });

  it('未登录应该返回 401', async () => {
    const res = await request(app)
      .post(`/api/registrations/${registrationId}/certificate`)
      .send({
        certificate_url: 'https://example.com/cert.pdf',
        finish_time: '3:45:30',
      });
    expect(res.status).toBe(401);
  });
});
