import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readClient: PrismaClient;

  constructor() {
    // 主库（写操作）- 使用默认的 DATABASE_URL（从环境变量读取）
    super({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
    });

    // 从库（读操作）- 如果配置了 DATABASE_READ_URL，否则使用主库
    const readUrl = process.env.DATABASE_READ_URL;
    
    // 确保 readClient 总是被初始化
    if (readUrl && readUrl !== process.env.DATABASE_URL) {
      // 配置了独立的从库 - 使用 datasources 配置
      this.readClient = new PrismaClient({
        datasources: {
          db: {
            url: readUrl,
          },
        },
        log: process.env.NODE_ENV === 'development' 
          ? ['query', 'info', 'warn', 'error']
          : ['warn', 'error'],
      });
      this.logger.log('📖 已配置读写分离：从库连接已初始化');
    } else {
      // 未配置从库，使用主库进行读操作
      this.readClient = this;
      this.logger.log('ℹ️  未配置从库，读操作将使用主库');
    }
    
    // 确保 readClient 已初始化
    if (!this.readClient) {
      this.logger.warn('⚠️  readClient 初始化失败，使用主库作为后备');
      this.readClient = this;
    }
  }

  async onModuleInit() {
    try {
      // 连接主库（写）
      await this.$connect();
      this.logger.log('✅ 主库（写）连接成功');

      // 连接从库（如果不是同一个实例）
      if (this.readClient !== this) {
        await this.readClient.$connect();
        this.logger.log('✅ 从库（读）连接成功');
      } else {
        this.logger.log('ℹ️  使用主库进行读操作（未配置从库）');
      }

      // 测试主库连接
      await this.$queryRaw`SELECT 1 as test`;
      this.logger.log('✅ 数据库连接测试成功');
    } catch (error) {
      this.logger.error('❌ 数据库连接失败', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    // 如果从库是独立实例，也需要断开连接
    if (this.readClient !== this) {
      await this.readClient.$disconnect();
    }
  }

  /**
   * 获取读客户端（从库）
   * 用于所有 SELECT 查询操作
   * 
   * @example
   * ```typescript
   * const items = await this.prisma.read.item.findMany();
   * ```
   */
  get read(): PrismaClient {
    // 确保 readClient 已初始化
    if (!this.readClient) {
      this.logger.warn('readClient 未初始化，使用主库');
      return this;
    }
    return this.readClient;
  }

  /**
   * 获取写客户端（主库）
   * 用于所有 INSERT、UPDATE、DELETE 操作
   * 
   * @example
   * ```typescript
   * const item = await this.prisma.write.item.create({ data });
   * ```
   */
  get write(): PrismaClient {
    // 直接返回 this，但需要确保原型链正确
    // 由于 PrismaService 继承自 PrismaClient，this 本身就是 PrismaClient 实例
    return Object.getPrototypeOf(this).constructor.prototype.isPrototypeOf(this) 
      ? this 
      : this;
  }
}