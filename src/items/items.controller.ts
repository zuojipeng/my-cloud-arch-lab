import { Controller, Get, Post, Body, Param, Delete, Put, Query, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ItemsService } from './items.service';
import { Item, Prisma } from '@prisma/client';

@Controller('api/items')
export class ItemsController {
  private readonly logger = new Logger(ItemsController.name);

  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  async create(@Body() createItemDto: Prisma.ItemCreateInput) {
    try {
      this.logger.log(`创建项目: ${JSON.stringify(createItemDto)}`);
      return await this.itemsService.create(createItemDto);
    } catch (error) {
      this.logger.error('创建项目失败:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `创建项目失败: ${error.message || '未知错误'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  findAll(
    @Query('skip') skip: string,
    @Query('take') take: string,
  ) {
    return this.itemsService.findAll(
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 10,
    );
  }

  @Get('count')
  count() {
    return this.itemsService.count();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.itemsService.findOne(parseInt(id));
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateItemDto: Prisma.ItemUpdateInput,
  ) {
    return this.itemsService.update(parseInt(id), updateItemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.itemsService.remove(parseInt(id));
  }
}