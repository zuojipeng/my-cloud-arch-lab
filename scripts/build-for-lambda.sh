#!/bin/bash
# build-for-lambda.sh - 为 Lambda 部署构建项目

set -e

echo "======================================"
echo "🔨 开始构建 Lambda 部署包"
echo "======================================"

# 1. 清理旧的构建产物
echo ""
echo "[1/4] 清理旧的构建产物..."
rm -rf dist
rm -rf .aws-sam

# 2. 生成 Prisma Client
echo ""
echo "[2/4] 生成 Prisma Client..."
# 使用 pnpm 的执行器生成 Prisma Client（避免 npx 与 pnpm 目录结构不兼容）
# 如果这里失败，大概率是还没安装依赖（请先执行 `make install` 或 `pnpm install`）
pnpm exec prisma generate

# 3. 构建 NestJS 应用
echo ""
echo "[3/4] 构建 NestJS 应用..."
pnpm build

# 4. 验证构建产物
echo ""
echo "[4/4] 验证构建产物..."
if [ ! -f "dist/lambda.js" ]; then
  echo "❌ 错误: dist/lambda.js 不存在"
  exit 1
fi

if [ ! -d "node_modules/@prisma/client" ]; then
  echo "❌ 错误: Prisma Client 未生成"
  exit 1
fi

echo ""
echo "✅ 构建完成！"
echo ""
echo "下一步:"
echo "  1. 运行 'sam build' 构建 SAM 应用"
echo "  2. 运行 'make sam-build' 会自动优化构建包大小"
echo "  3. 运行 'sam deploy' 部署到 AWS"

