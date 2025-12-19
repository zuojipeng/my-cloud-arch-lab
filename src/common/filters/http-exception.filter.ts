import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
        ? exception.message
        : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: typeof message === 'string' ? message : (message as any).message || message,
      ...(process.env.NODE_ENV === 'development' && {
        error: exception instanceof Error ? exception.stack : undefined,
      }),
    };

    this.logger.error(
      `${request.method} ${request.url} - ${status}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );

    // 确保异常响应也带上 CORS 头，否则前端会看到 CORS 错误而不是实际错误信息
    const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '*';
    let originToSet = '*';

    if (allowedOriginsEnv !== '*') {
      const allowedList = allowedOriginsEnv.split(',').map((o) => o.trim());
      const requestOrigin = request.headers.origin as string | undefined;
      if (requestOrigin && allowedList.includes(requestOrigin)) {
        originToSet = requestOrigin;
      }
    }

    response.header('Access-Control-Allow-Origin', originToSet);
    response.header(
      'Access-Control-Allow-Headers',
      'Content-Type,Authorization,Accept',
    );
    response.header(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    );

    response.status(status).json(errorResponse);
  }
}

