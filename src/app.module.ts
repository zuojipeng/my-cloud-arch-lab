import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ItemsModule } from './items/items.module';
import { GitHubModule } from './github/github.module';

@Module({
  imports: [ItemsModule, GitHubModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
