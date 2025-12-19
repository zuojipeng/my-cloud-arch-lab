import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

describe('Items API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let createdItemId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    
    await app.init();
  });

  afterAll(async () => {
    // 清理测试数据
    if (createdItemId) {
      try {
        await prisma.write.item.delete({ where: { id: createdItemId } });
      } catch (error) {
        // 忽略清理错误
      }
    }
    await app.close();
  });

  describe('POST /api/items - 创建项目', () => {
    it('应该成功创建项目', () => {
      return request(app.getHttpServer())
        .post('/api/items')
        .send({
          name: '测试项目',
          value: '测试值',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('测试项目');
          expect(res.body.value).toBe('测试值');
          expect(res.body).toHaveProperty('createdAt');
          expect(res.body).toHaveProperty('updatedAt');
          createdItemId = res.body.id;
        });
    });

    it('应该成功创建项目（无 value）', () => {
      return request(app.getHttpServer())
        .post('/api/items')
        .send({
          name: '测试项目2',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('测试项目2');
          expect(res.body.value).toBeNull();
        });
    });

    it('缺少 name 应该返回错误', () => {
      return request(app.getHttpServer())
        .post('/api/items')
        .send({
          value: '只有值',
        })
        .expect(400);
    });
  });

  describe('GET /api/items - 获取所有项目', () => {
    it('应该返回项目列表', () => {
      return request(app.getHttpServer())
        .get('/api/items')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            expect(res.body[0]).toHaveProperty('id');
            expect(res.body[0]).toHaveProperty('name');
            expect(res.body[0]).toHaveProperty('createdAt');
          }
        });
    });

    it('应该支持分页查询', () => {
      return request(app.getHttpServer())
        .get('/api/items?skip=0&take=5')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeLessThanOrEqual(5);
        });
    });
  });

  describe('GET /api/items/:id - 获取单个项目', () => {
    it('应该返回指定项目', async () => {
      // 先创建一个项目
      const createRes = await request(app.getHttpServer())
        .post('/api/items')
        .send({ name: '查询测试', value: '测试值' })
        .expect(201);

      const itemId = createRes.body.id;

      return request(app.getHttpServer())
        .get(`/api/items/${itemId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(itemId);
          expect(res.body.name).toBe('查询测试');
          expect(res.body.value).toBe('测试值');
        });
    });

    it('不存在的 ID 应该返回 404', () => {
      return request(app.getHttpServer())
        .get('/api/items/999999')
        .expect(404);
    });
  });

  describe('GET /api/items/count - 获取项目总数', () => {
    it('应该返回项目总数', () => {
      return request(app.getHttpServer())
        .get('/api/items/count')
        .expect(200)
        .expect((res) => {
          expect(typeof res.body).toBe('number');
          expect(res.body).toBeGreaterThanOrEqual(0);
        });
    });
  });

  describe('PUT /api/items/:id - 更新项目', () => {
    it('应该成功更新项目', async () => {
      // 先创建一个项目
      const createRes = await request(app.getHttpServer())
        .post('/api/items')
        .send({ name: '更新前', value: '旧值' })
        .expect(201);

      const itemId = createRes.body.id;

      return request(app.getHttpServer())
        .put(`/api/items/${itemId}`)
        .send({ name: '更新后', value: '新值' })
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(itemId);
          expect(res.body.name).toBe('更新后');
          expect(res.body.value).toBe('新值');
        });
    });

    it('不存在的 ID 应该返回 404', () => {
      return request(app.getHttpServer())
        .put('/api/items/999999')
        .send({ name: '更新测试' })
        .expect(404);
    });
  });

  describe('DELETE /api/items/:id - 删除项目', () => {
    it('应该成功删除项目', async () => {
      // 先创建一个项目
      const createRes = await request(app.getHttpServer())
        .post('/api/items')
        .send({ name: '删除测试', value: '测试值' })
        .expect(201);

      const itemId = createRes.body.id;

      return request(app.getHttpServer())
        .delete(`/api/items/${itemId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
        });
    });

    it('不存在的 ID 应该返回 404', () => {
      return request(app.getHttpServer())
        .delete('/api/items/999999')
        .expect(404);
    });
  });
});

