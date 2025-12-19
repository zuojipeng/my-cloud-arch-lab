import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

/**
 * API 集成测试
 * 测试完整的 API 流程，包括读写分离验证
 */
describe('API Integration Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testItemIds: number[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    
    await app.init();
  });

  afterAll(async () => {
    // 清理所有测试数据
    for (const id of testItemIds) {
      try {
        await prisma.write.item.delete({ where: { id } });
      } catch (error) {
        // 忽略清理错误
      }
    }
    await app.close();
  });

  describe('完整的 CRUD 流程', () => {
    it('应该完成完整的创建-读取-更新-删除流程', async () => {
      // 1. 创建项目
      const createRes = await request(app.getHttpServer())
        .post('/api/items')
        .send({
          name: '集成测试项目',
          value: '集成测试值',
        })
        .expect(201);

      const itemId = createRes.body.id;
      testItemIds.push(itemId);

      expect(createRes.body.name).toBe('集成测试项目');
      expect(createRes.body.value).toBe('集成测试值');

      // 2. 读取项目（验证读操作使用从库）
      const getRes = await request(app.getHttpServer())
        .get(`/api/items/${itemId}`)
        .expect(200);

      expect(getRes.body.id).toBe(itemId);
      expect(getRes.body.name).toBe('集成测试项目');

      // 3. 更新项目（验证写操作使用主库）
      const updateRes = await request(app.getHttpServer())
        .put(`/api/items/${itemId}`)
        .send({
          name: '更新后的项目',
          value: '更新后的值',
        })
        .expect(200);

      expect(updateRes.body.name).toBe('更新后的项目');
      expect(updateRes.body.value).toBe('更新后的值');

      // 4. 验证更新后的数据（再次读取）
      const getAfterUpdateRes = await request(app.getHttpServer())
        .get(`/api/items/${itemId}`)
        .expect(200);

      expect(getAfterUpdateRes.body.name).toBe('更新后的项目');

      // 5. 删除项目
      await request(app.getHttpServer())
        .delete(`/api/items/${itemId}`)
        .expect(200);

      // 6. 验证删除成功
      await request(app.getHttpServer())
        .get(`/api/items/${itemId}`)
        .expect(404);

      // 从清理列表中移除
      testItemIds = testItemIds.filter(id => id !== itemId);
    });
  });

  describe('分页功能', () => {
    it('应该正确支持分页查询', async () => {
      // 创建多个测试项目
      const items = [];
      for (let i = 0; i < 5; i++) {
        const res = await request(app.getHttpServer())
          .post('/api/items')
          .send({ name: `分页测试 ${i}`, value: `值 ${i}` })
          .expect(201);
        items.push(res.body);
        testItemIds.push(res.body.id);
      }

      // 测试分页
      const page1 = await request(app.getHttpServer())
        .get('/api/items?skip=0&take=2')
        .expect(200);

      expect(page1.body.length).toBeLessThanOrEqual(2);

      const page2 = await request(app.getHttpServer())
        .get('/api/items?skip=2&take=2')
        .expect(200);

      expect(page2.body.length).toBeLessThanOrEqual(2);
    });
  });

  describe('错误处理', () => {
    it('应该正确处理无效的请求', async () => {
      // 无效的创建请求
      await request(app.getHttpServer())
        .post('/api/items')
        .send({})
        .expect(400);

      // 无效的更新请求
      await request(app.getHttpServer())
        .put('/api/items/999999')
        .send({ name: '测试' })
        .expect(404);

      // 无效的删除请求
      await request(app.getHttpServer())
        .delete('/api/items/999999')
        .expect(404);
    });
  });
});

