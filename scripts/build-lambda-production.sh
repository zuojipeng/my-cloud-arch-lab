#!/bin/bash

# 生产环境 Lambda 构建脚本 - 只包含必要的依赖

set -e

BUILD_DIR=".aws-sam/build/CloudArchApiFunction"

echo "=========================================="
echo "🔨 生产环境 Lambda 构建"
echo "=========================================="
echo ""

# 检查是否已运行 sam build
if [ ! -d "$BUILD_DIR" ]; then
  echo "❌ 请先运行: sam build"
  exit 1
fi

# 进入构建目录（下面所有操作都在 SAM 已经构建好的产物上进行“瘦身”）
cd "$BUILD_DIR"

# 确保 dist 目录存在（这是 Lambda Handler 所在位置：dist/lambda.js）
# 注意：当前所在目录为 .aws-sam/build/CloudArchApiFunction，项目根目录在 ../../../
if [ ! -d "dist" ] && [ -d "../../../dist" ]; then
  echo "📦 复制 dist 目录到构建目录（包含 lambda.js 等运行时代码）..."
  cp -r ../../../dist . 2>/dev/null || true
fi

# 清理缓存和不必要的文件（安全瘦身，不影响运行时代码）
echo "🧹 清理缓存和不必要的文件..."
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf node_modules/.ignored 2>/dev/null || true  # 删除 pnpm ignored 文件
# .pnpm 已经在上面删除了，这里再次确保删除
rm -rf node_modules/.pnpm 2>/dev/null || true  # 删除 pnpm 存储目录（268MB！）
find node_modules -name ".pnpm-store" -type d -exec rm -rf {} + 2>/dev/null || true

# 删除不必要的文件
echo "🗑️  删除不必要的文件..."

# 删除 TypeScript 定义文件（运行时不需要）
find node_modules -type f -name "*.d.ts" -delete 2>/dev/null || true

# 删除 source maps
find node_modules -type f -name "*.map" -delete 2>/dev/null || true

# 额外：删除与 Lambda 运行时无关的平台二进制（只保留 rhel-openssl-3.0.x）
echo "🗑️  删除与 Lambda 无关的平台二进制 (darwin/windows)..."
find node_modules -type f -name "*darwin*" -delete 2>/dev/null || true
find node_modules -type f -name "*windows*" -delete 2>/dev/null || true

# 删除测试文件
find node_modules -type f -name "*.test.js" -delete 2>/dev/null || true
find node_modules -type f -name "*.spec.js" -delete 2>/dev/null || true
find node_modules -type d -name "__tests__" -exec rm -rf {} + 2>/dev/null || true
find node_modules -type d -name "test" -exec rm -rf {} + 2>/dev/null || true

# 删除文档
find node_modules -type f -name "README.md" -delete 2>/dev/null || true
find node_modules -type f -name "CHANGELOG.md" -delete 2>/dev/null || true
find node_modules -type f -name "LICENSE" -delete 2>/dev/null || true
find node_modules -type f -name "LICENSE.txt" -delete 2>/dev/null || true

# 返回原目录
cd - > /dev/null

echo ""
echo "📊 最终大小:"
FINAL_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)
UNZIPPED_SIZE_MB=$(du -sm "$BUILD_DIR" | cut -f1)
echo "  总大小: $FINAL_SIZE"
echo "  解压后: ${UNZIPPED_SIZE_MB} MB"
echo ""

if [ "$UNZIPPED_SIZE_MB" -gt 250 ]; then
  echo "⚠️  警告: 仍然超过 250 MB (${UNZIPPED_SIZE_MB} MB)"
  echo ""
  echo "💡 建议使用 Lambda Layers 来分离 Prisma Client"
else
  echo "✅ 大小在限制内（250 MB）"
fi

echo ""
echo "✅ 构建完成！"

