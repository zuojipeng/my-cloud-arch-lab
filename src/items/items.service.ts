import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.item.findMany();
  }

  async create(data: { name: string; value: string }) {
    return this.prisma.item.create({ data });
  }

  async delete(id: number) {
    return this.prisma.item.delete({ where: { id } });
  }
}
