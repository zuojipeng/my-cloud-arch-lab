import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Item, Prisma } from '@prisma/client';

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  // 创建项目
  async create(data: Prisma.ItemCreateInput): Promise<Item> {
    return this.prisma.item.create({
      data,
    });
  }

  // 获取所有项目（带分页可选）
  async findAll(skip = 0, take = 10): Promise<Item[]> {
    return this.prisma.item.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  // 获取单个项目
  async findOne(id: number): Promise<Item> {
    const item = await this.prisma.item.findUnique({
      where: { id },
    });
    
    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }
    
    return item;
  }

  // 更新项目
  async update(id: number, data: Prisma.ItemUpdateInput): Promise<Item> {
    try {
      return await this.prisma.item.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }
  }

  // 删除项目
  async remove(id: number): Promise<Item> {
    try {
      return await this.prisma.item.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }
  }

  // 获取项目总数（用于分页）
  async count(): Promise<number> {
    return this.prisma.item.count();
  }
}