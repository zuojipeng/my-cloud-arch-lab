#!/bin/bash

# 检查 Lambda 部署包大小的脚本

set -e

echo "=========================================="
echo "📦 检查 Lambda 部署包大小"
echo "=========================================="
echo ""

# 检查是否已构建
if [ ! -d ".aws-sam/build/CloudArchApiFunction" ]; then
  echo "❌ 未找到构建目录，请先运行:"
  echo "   1. pnpm build"
  echo "   2. npx prisma generate"
  echo "   3. sam build"
  exit 1
fi

BUILD_DIR=".aws-sam/build/CloudArchApiFunction"

echo "📊 构建目录大小分析："
echo ""

# 总大小
TOTAL_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)
echo "总大小: $TOTAL_SIZE"
echo ""

# 详细分析
echo "📁 各目录大小："
du -sh "$BUILD_DIR"/* 2>/dev/null | sort -h
echo ""

# node_modules 大小（如果存在）
if [ -d "$BUILD_DIR/node_modules" ]; then
  NODE_MODULES_SIZE=$(du -sh "$BUILD_DIR/node_modules" | cut -f1)
  echo "⚠️  node_modules 大小: $NODE_MODULES_SIZE"
  
  # 检查是否包含了完整的 node_modules
  NODE_MODULES_COUNT=$(find "$BUILD_DIR/node_modules" -type d -maxdepth 1 | wc -l)
  echo "   node_modules 子目录数量: $NODE_MODULES_COUNT"
  
  if [ "$NODE_MODULES_COUNT" -gt 100 ]; then
    echo "   ⚠️  警告: 可能包含了完整的 node_modules"
  fi
  echo ""
fi

# 检查 Prisma
if [ -d "$BUILD_DIR/node_modules/@prisma" ]; then
  PRISMA_SIZE=$(du -sh "$BUILD_DIR/node_modules/@prisma" | cut -f1)
  echo "✅ Prisma Client: $PRISMA_SIZE"
fi

# 计算压缩后的大小（估算）
echo ""
echo "📦 压缩后大小估算："
ZIP_SIZE=$(cd "$BUILD_DIR" && zip -r -q /tmp/lambda-package.zip . && du -h /tmp/lambda-package.zip | cut -f1 && rm /tmp/lambda-package.zip)
echo "ZIP 大小: $ZIP_SIZE"

# Lambda 限制
echo ""
echo "📋 Lambda 限制："
echo "  - 压缩包: 50 MB"
echo "  - 解压后: 250 MB"
echo ""

# 检查是否超过限制
UNZIPPED_SIZE=$(du -sm "$BUILD_DIR" | cut -f1)
if [ "$UNZIPPED_SIZE" -gt 250 ]; then
  echo "❌ 错误: 解压后大小 ($UNZIPPED_SIZE MB) 超过 250 MB 限制！"
  echo ""
  echo "💡 解决方案："
  echo "  1. 检查 .samignore 是否正确排除了不必要的文件"
  echo "  2. 确保只包含运行时需要的依赖"
  echo "  3. 考虑使用 Lambda Layers 来分离依赖"
  exit 1
else
  echo "✅ 解压后大小 ($UNZIPPED_SIZE MB) 在限制内"
fi

echo ""
echo "✅ 检查完成"

