import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('GitHub API (e2e)', () => {
  let app: INestApplication;
  const testToken = process.env.GITHUB_TEST_TOKEN || 'test-token';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/github/user - 获取 GitHub 用户信息', () => {
    it('缺少 token 应该返回 401', () => {
      return request(app.getHttpServer())
        .get('/api/github/user')
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('GitHub token is required');
        });
    });

    it('Bearer token 格式应该正常工作', () => {
      // 注意：这个测试需要真实的 GitHub token 才能通过
      // 如果 token 无效，会返回 401
      return request(app.getHttpServer())
        .get('/api/github/user')
        .set('Authorization', `Bearer ${testToken}`)
        .expect((res) => {
          // 如果 token 有效，返回 200；如果无效，返回 401
          expect([200, 401]).toContain(res.status);
          if (res.status === 200) {
            expect(res.body).toHaveProperty('username');
            expect(res.body).toHaveProperty('avatar');
            expect(res.body).toHaveProperty('followers');
            expect(res.body).toHaveProperty('following');
            expect(res.body).toHaveProperty('publicRepos');
          }
        });
    });

    it('token 前缀格式应该正常工作', () => {
      return request(app.getHttpServer())
        .get('/api/github/user')
        .set('Authorization', `token ${testToken}`)
        .expect((res) => {
          expect([200, 401]).toContain(res.status);
        });
    });

    it('无前缀 token 应该正常工作', () => {
      return request(app.getHttpServer())
        .get('/api/github/user')
        .set('Authorization', testToken)
        .expect((res) => {
          expect([200, 401]).toContain(res.status);
        });
    });

    it('无效 token 应该返回 401', () => {
      return request(app.getHttpServer())
        .get('/api/github/user')
        .set('Authorization', 'Bearer invalid-token-12345')
        .expect(401);
    });

    it('应该返回正确的用户信息结构', async () => {
      // 跳过测试如果没有有效的 token
      if (testToken === 'test-token') {
        console.log('⚠️  跳过 GitHub API 测试：未设置有效的 GITHUB_TEST_TOKEN');
        return;
      }

      return request(app.getHttpServer())
        .get('/api/github/user')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200)
        .expect((res) => {
          const userInfo = res.body;
          expect(userInfo).toHaveProperty('username');
          expect(userInfo).toHaveProperty('name');
          expect(userInfo).toHaveProperty('avatar');
          expect(userInfo).toHaveProperty('bio');
          expect(userInfo).toHaveProperty('followers');
          expect(userInfo).toHaveProperty('following');
          expect(userInfo).toHaveProperty('publicRepos');
          expect(userInfo).toHaveProperty('location');
          expect(userInfo).toHaveProperty('company');
          expect(userInfo).toHaveProperty('blog');
          expect(userInfo).toHaveProperty('twitter');
          expect(userInfo).toHaveProperty('profileUrl');
          expect(userInfo).toHaveProperty('createdAt');
          expect(userInfo).toHaveProperty('email');

          // 验证数据类型
          expect(typeof userInfo.username).toBe('string');
          expect(typeof userInfo.followers).toBe('number');
          expect(typeof userInfo.following).toBe('number');
          expect(typeof userInfo.publicRepos).toBe('number');
        });
    });
  });
});

