#!/bin/bash

# 优化 Lambda 构建，减少包大小

set -e

BUILD_DIR=".aws-sam/build/CloudArchApiFunction"

echo "=========================================="
echo "🔧 优化 Lambda 构建包"
echo "=========================================="
echo ""

# 检查构建目录是否存在
if [ ! -d "$BUILD_DIR" ]; then
  echo "❌ 构建目录不存在，请先运行: sam build"
  exit 1
fi

echo "📊 优化前大小:"
BEFORE_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)
echo "  $BEFORE_SIZE"
echo ""

# 1. 删除不必要的文件
echo "🗑️  删除不必要的文件..."

# 删除开发依赖
find "$BUILD_DIR/node_modules" -type d -name "*.d.ts" -exec rm -rf {} + 2>/dev/null || true
find "$BUILD_DIR/node_modules" -type f -name "*.map" -delete 2>/dev/null || true
find "$BUILD_DIR/node_modules" -type f -name "*.test.js" -delete 2>/dev/null || true
find "$BUILD_DIR/node_modules" -type f -name "*.spec.js" -delete 2>/dev/null || true

# 删除 NestJS 不需要的文件
rm -rf "$BUILD_DIR/node_modules/@nestjs/cli" 2>/dev/null || true
rm -rf "$BUILD_DIR/node_modules/@nestjs/testing" 2>/dev/null || true
rm -rf "$BUILD_DIR/node_modules/@nestjs/schematics" 2>/dev/null || true

# 删除测试文件
rm -rf "$BUILD_DIR/test" 2>/dev/null || true

# 删除开发文件
rm -f "$BUILD_DIR/Makefile" 2>/dev/null || true
rm -f "$BUILD_DIR/deploy.config.example" 2>/dev/null || true
rm -f "$BUILD_DIR/deploy-ec2.sh" 2>/dev/null || true
rm -rf "$BUILD_DIR/scripts" 2>/dev/null || true

echo "✅ 已删除不必要的文件"
echo ""

# 2. 检查 Prisma Client
if [ -d "$BUILD_DIR/node_modules/@prisma/client" ]; then
  PRISMA_SIZE=$(du -sh "$BUILD_DIR/node_modules/@prisma/client" | cut -f1)
  echo "✅ Prisma Client: $PRISMA_SIZE"
fi

# 3. 显示优化后大小
echo ""
echo "📊 优化后大小:"
AFTER_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)
echo "  $AFTER_SIZE"
echo ""

# 4. 计算解压后大小（MB）
UNZIPPED_SIZE_MB=$(du -sm "$BUILD_DIR" | cut -f1)
echo "📦 解压后大小: ${UNZIPPED_SIZE_MB} MB"
echo ""

if [ "$UNZIPPED_SIZE_MB" -gt 250 ]; then
  echo "❌ 警告: 大小仍然超过 250 MB 限制！"
  echo ""
  echo "💡 建议："
  echo "  1. 考虑使用 Lambda Layers 来分离 Prisma Client"
  echo "  2. 或者使用更轻量的数据库客户端"
  exit 1
else
  echo "✅ 大小在限制内（250 MB）"
fi

echo ""
echo "✅ 优化完成！"

