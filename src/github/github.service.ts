import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';

export interface GitHubUserInfo {
  username: string;
  name: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  publicRepos: number;
  location: string | null;
  company: string | null;
  blog: string | null;
  twitter: string | null;
  profileUrl: string;
  createdAt: string;
  email: string | null;
}

@Injectable()
export class GitHubService {
  private readonly logger = new Logger(GitHubService.name);
  private readonly githubApiBase = 'https://api.github.com';

  /**
   * 通过 GitHub token 获取用户信息
   * @param token GitHub Personal Access Token
   * @returns GitHub 用户信息
   */
  async getUserInfo(token: string): Promise<GitHubUserInfo> {
    if (!token || token.trim() === '') {
      throw new HttpException(
        'GitHub token is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      this.logger.log('Fetching GitHub user info...');

      const response = await fetch(`${this.githubApiBase}/user`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'CloudArchLab-App',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `GitHub API error: ${response.status} - ${errorText}`,
        );

        if (response.status === 401) {
          throw new HttpException(
            'Invalid GitHub token. Please check your token.',
            HttpStatus.UNAUTHORIZED,
          );
        }

        if (response.status === 403) {
          throw new HttpException(
            'GitHub API rate limit exceeded or token lacks required permissions.',
            HttpStatus.FORBIDDEN,
          );
        }

        throw new HttpException(
          `GitHub API error: ${response.statusText}`,
          response.status,
        );
      }

      const githubData = await response.json();

      // 格式化返回数据
      const userInfo: GitHubUserInfo = {
        username: githubData.login || '',
        name: githubData.name || '',
        avatar: githubData.avatar_url || '',
        bio: githubData.bio || '',
        followers: githubData.followers || 0,
        following: githubData.following || 0,
        publicRepos: githubData.public_repos || 0,
        location: githubData.location || null,
        company: githubData.company || null,
        blog: githubData.blog || null,
        twitter: githubData.twitter_username || null,
        profileUrl: githubData.html_url || '',
        createdAt: githubData.created_at || '',
        email: githubData.email || null,
      };

      this.logger.log(`Successfully fetched GitHub info for user: ${userInfo.username}`);
      return userInfo;
    } catch (error) {
      this.logger.error('Error fetching GitHub user info', error);

      if (error instanceof HttpException) {
        throw error;
      }

      // 处理网络错误或其他未知错误
      throw new HttpException(
        'Failed to fetch GitHub user information. Please check your network connection and try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 验证 GitHub token 是否有效
   * @param token GitHub Personal Access Token
   * @returns 是否有效
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.githubApiBase}/user`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'CloudArchLab-App',
        },
      });

      return response.ok;
    } catch (error) {
      this.logger.error('Error validating GitHub token', error);
      return false;
    }
  }
}

