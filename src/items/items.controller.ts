import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ItemsService } from './items.service';

@Controller('api/items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  async findAll() {
    try {
      return await this.itemsService.findAll();
    } catch (error) {
      throw new Error('Failed to fetch items');
    }
  }

  @Post()
  async create(@Body() body: { name: string; value: string }) {
    try {
      return await this.itemsService.create(body);
    } catch (error) {
      throw new Error('Failed to create item');
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    try {
      await this.itemsService.delete(parseInt(id));
      return { success: true };
    } catch (error) {
      throw new Error('Failed to delete item');
    }
  }
}
