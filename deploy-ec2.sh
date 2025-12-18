#!/bin/bash
# deploy-ec2.sh - 生产环境稳健版

set -e  # 遇到错误立即退出

# --- 加载配置文件（如果存在）---
if [ -f "deploy.config" ]; then
    echo "📋 加载 deploy.config 配置文件..."
    source deploy.config
fi

# --- 配置区 ---
# 从环境变量读取配置，如果没有设置则使用默认值
EC2_IP="${EC2_IP:-3.16.11.151}"
SSH_KEY="${SSH_KEY:-~/Downloads/weekend-key.pem}"
APP_NAME="${APP_NAME:-weekend-api}"
REMOTE_DIR="${REMOTE_DIR:-cloud-arch-lab}"

echo "======================================"
echo "🚀 开始部署到 EC2: $EC2_IP"
echo "======================================"

# 1. 本地构建
echo ""
echo "[1/6] 正在本地执行构建..."
pnpm build

# 2. 上传核心文件
echo ""
echo "[2/6] 上传必要文件到 EC2..."
# 确保远程目录存在，并清理可能存在的旧目录（处理大小写问题）
ssh -i "$SSH_KEY" "ec2-user@${EC2_IP}" "rm -rf ~/ClOUD-ARCH-LAB ~/CLOUD-ARCH-LAB; mkdir -p ~/${REMOTE_DIR}"

# 上传编译后的代码、数据库定义和依赖清单
# 注意：我们故意不上传 prisma.config.ts 以避免服务器环境兼容性报错
echo "上传 dist、prisma、package.json、pnpm-lock.yaml..."
scp -i "$SSH_KEY" -r dist prisma package.json pnpm-lock.yaml "ec2-user@${EC2_IP}:~/${REMOTE_DIR}/"

# 验证上传是否成功
echo "验证上传的文件..."
ssh -i "$SSH_KEY" "ec2-user@${EC2_IP}" "ls -la ~/${REMOTE_DIR}/ | grep -E 'dist|package.json|pnpm-lock.yaml'"

# 3. 处理环境变量
if [ -f ".env.production" ]; then
    echo "使用 .env.production 配置..."
    scp -i "$SSH_KEY" .env.production "ec2-user@${EC2_IP}:~/${REMOTE_DIR}/.env"
else
    echo "未发现生产环境配置，将在服务器自动生成基础配置..."
fi

# 4. 在 EC2 上执行核心部署逻辑
echo ""
echo "[3/6] 在远程服务器执行初始化..."
ssh -i "$SSH_KEY" "ec2-user@${EC2_IP}" << 'ENDSSH'
cd ~/cloud-arch-lab

# --- 清理旧文件（强制使用新版本）---
echo "正在清理旧的依赖和构建文件..."
# 完全清理：删除 node_modules、pnpm store、生成的 Prisma Client
rm -rf node_modules
rm -rf ~/.pnpm-store 2>/dev/null || true
# 清理所有 Prisma 相关文件（强制重新生成）
find . -name ".prisma" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "@prisma" -type d -exec rm -rf {} + 2>/dev/null || true
rm -f prisma.config.ts prisma.config.js
# 清理可能存在的旧 Prisma Client
rm -rf node_modules/.prisma 2>/dev/null || true
rm -rf node_modules/@prisma 2>/dev/null || true

# --- 验证必要文件是否存在 ---
if [ ! -d "dist" ]; then
    echo "❌ 错误：dist 目录不存在！"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ 错误：package.json 不存在！"
    exit 1
fi

# --- 检查环境变量 ---
if [ ! -f ".env" ]; then
    echo "❌ 错误：缺少 .env 文件！"
    echo "请确保本地有 .env.production 文件，或在服务器手动配置 DATABASE_URL"
    exit 1
fi

# 验证 DATABASE_URL 格式（不显示密码）
echo "验证 DATABASE_URL 配置..."
if grep -q "DATABASE_URL" .env; then
    DATABASE_URL_PREVIEW=$(grep "DATABASE_URL" .env | sed 's/:[^@]*@/:***@/')
    echo "✅ DATABASE_URL 已配置: $DATABASE_URL_PREVIEW"
else
    echo "❌ .env 文件中没有 DATABASE_URL！"
    exit 1
fi

# 安装依赖（包括 devDependencies，因为需要 prisma CLI）
echo "正在安装所有依赖（包括 devDependencies，用于生成 Prisma Client）..."
# 强制重新安装，不使用缓存
pnpm install --frozen-lockfile --force

# 验证安装的 Prisma 版本
echo "验证 Prisma 版本..."
pnpm list @prisma/client prisma | grep -E "@prisma|prisma" || true

# 生成 Prisma Client (使用本地安装的 prisma)
echo "正在生成 Prisma Client..."
pnpm exec prisma generate || npx prisma generate

# 验证生成的 Prisma Client 版本
echo "验证 Prisma Client 生成..."
if [ -d "node_modules/@prisma/client" ]; then
    echo "✅ Prisma Client 已生成"
    cat node_modules/@prisma/client/package.json | grep '"version"' || true
else
    echo "❌ Prisma Client 生成失败！"
    exit 1
fi

# 同步数据库架构（跳过，因为使用 Supabase 云数据库，已经在本地同步过）
echo "跳过数据库同步 (使用云端 Supabase PostgreSQL)..."
echo "注意：如果 schema 有变化，请先在本地执行 'npx prisma db push'"

# --- 5. 使用 PM2 启动服务 ---
echo ""
echo "[4/6] 正在通过 PM2 重启应用..."
# 完全停止并删除所有相关进程
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
# 确保 weekend-api 进程被删除
pm2 delete "$APP_NAME" 2>/dev/null || true
pm2 delete "" 2>/dev/null || true
pm2 delete main 2>/dev/null || true

# 启动新进程（确保加载 .env 文件）
pm2 start dist/main.js --name "$APP_NAME" --cwd ~/cloud-arch-lab --update-env

pm2 save
ENDSSH

# 6. 最终验证
echo ""
echo "[5/6] 正在验证服务状态..."
sleep 3
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://${EC2_IP}:3000/items" || echo "failed")

if [[ "$STATUS_CODE" == "200" || "$STATUS_CODE" == "201" || "$STATUS_CODE" == "404" ]]; then
    echo "✅ 应用已在线 (HTTP 状态码: $STATUS_CODE)"
    echo "注意: 404 可能表示接口路径正确但暂无内容，500 则表示依然存在代码错误"
else
    echo "❌ 服务响应异常 (状态码: $STATUS_CODE)"
    echo "正在拉取最后 20 行日志进行排查..."
    ssh -i "$SSH_KEY" "ec2-user@${EC2_IP}" "pm2 logs $APP_NAME --lines 20 --no-daemon"
fi

echo ""
echo "======================================"
echo "🎉 部署流程结束！"
echo "API 地址: http://${EC2_IP}:3000"
echo "======================================"