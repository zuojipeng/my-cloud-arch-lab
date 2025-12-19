import {
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { GitHubService, GitHubUserInfo } from './github.service';

@Controller('api/github')
export class GitHubController {
  private readonly logger = new Logger(GitHubController.name);

  constructor(private readonly githubService: GitHubService) {}

  /**
   * 获取 GitHub 用户信息
   * GET /api/github/user
   * 
   * 需要在请求头中提供 Authorization: Bearer <token> 或 Authorization: token <token>
   */
  @Get('user')
  async getUserInfo(
    @Headers('authorization') authorization?: string,
  ): Promise<GitHubUserInfo> {
    try {
      // 从 Authorization 头中提取 token
      let token: string | undefined;

      if (authorization) {
        // 支持两种格式: "Bearer <token>" 或 "token <token>"
        if (authorization.startsWith('Bearer ')) {
          token = authorization.substring(7).trim();
        } else if (authorization.startsWith('token ')) {
          token = authorization.substring(6).trim();
        } else {
          // 如果没有前缀，直接使用整个字符串作为 token
          token = authorization.trim();
        }
      }

      if (!token) {
        throw new HttpException(
          'GitHub token is required. Please provide it in the Authorization header.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      this.logger.log('Received request to fetch GitHub user info');

      const userInfo = await this.githubService.getUserInfo(token);

      return userInfo;
    } catch (error) {
      this.logger.error('Error in getUserInfo endpoint', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to fetch GitHub user information',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

