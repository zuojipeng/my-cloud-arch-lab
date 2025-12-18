import { Controller, Get, Post, Body, Param, Delete, Put, Query } from '@nestjs/common';
import { ItemsService } from './items.service';
import { Item, Prisma } from '@prisma/client';

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  create(@Body() createItemDto: Prisma.ItemCreateInput) {
    return this.itemsService.create(createItemDto);
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