import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import serverlessExpress from '@vendia/serverless-express';
import { Context, Handler, Callback } from 'aws-lambda';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

let cachedServer: Handler;

async function bootstrap(): Promise<Handler> {
  if (!cachedServer) {
    // 使用 Nest 默认的 Express 适配器，避免手动操作 express 实例触发 app.router 兼容检查
    const nestApp = await NestFactory.create(AppModule);

    // 全局异常过滤器
    nestApp.useGlobalFilters(new AllExceptionsFilter());

    // CORS 配置
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : '*';

    nestApp.enableCors({
      origin: allowedOrigins,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    });

    await nestApp.init();

    // 从 Nest 获取底层的 Express 实例，再交给 serverless-express
    const expressApp = nestApp.getHttpAdapter().getInstance();
    cachedServer = serverlessExpress({ app: expressApp });
  }
  return cachedServer;
}

export const handler = async (
  event: any,
  context: Context,
  callback: Callback,
): Promise<any> => {
  // 禁用 Lambda 超时等待（让 serverless-express 处理）
  context.callbackWaitsForEmptyEventLoop = false;

  const server = await bootstrap();
  return server(event, context, callback);
};

