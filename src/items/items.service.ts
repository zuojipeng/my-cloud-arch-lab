import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Item, Prisma } from '@prisma/client';

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  // 创建项目 - 使用写库（主库）
  async create(data: Prisma.ItemCreateInput): Promise<Item> {
    try {
      // 直接使用 this.prisma（PrismaService 继承自 PrismaClient，本身就是写库）
      return await this.prisma.item.create({
        data,
      });
    } catch (error) {
      console.error('创建项目失败:', error);
      throw error;
    }
  }

  // 获取所有项目（带分页可选）- 使用读库（从库）
  async findAll(skip = 0, take = 10): Promise<Item[]> {
    return this.prisma.read.item.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  // 获取单个项目 - 使用读库（从库）
  async findOne(id: number): Promise<Item> {
    const item = await this.prisma.read.item.findUnique({
      where: { id },
    });
    
    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }
    
    return item;
  }

  // 更新项目 - 使用写库（主库）
  async update(id: number, data: Prisma.ItemUpdateInput): Promise<Item> {
    try {
      // 直接使用 this.prisma（主库）
      return await this.prisma.item.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }
  }

  // 删除项目 - 使用写库（主库）
  async remove(id: number): Promise<Item> {
    try {
      // 直接使用 this.prisma（主库）
      return await this.prisma.item.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }
  }

  // 获取项目总数（用于分页）- 使用读库（从库）
  async count(): Promise<number> {
    return this.prisma.read.item.count();
  }
}