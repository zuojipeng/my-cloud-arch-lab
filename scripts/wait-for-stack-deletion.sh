#!/bin/bash

# 等待 Stack 删除完成

STACK_NAME="cloud-arch-lab-stack"
REGION="us-east-1"
MAX_WAIT=300  # 最多等待 5 分钟
INTERVAL=10   # 每 10 秒检查一次

echo "等待 Stack '$STACK_NAME' 删除完成..."
echo ""

for i in $(seq 1 $((MAX_WAIT / INTERVAL))); do
  STATUS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].StackStatus' \
    --output text 2>&1)
  
  if echo "$STATUS" | grep -q "does not exist"; then
    echo "✅ Stack 已成功删除！"
    exit 0
  fi
  
  echo "⏳ Stack 状态: $STATUS ($((i * INTERVAL)) 秒)"
  sleep $INTERVAL
done

echo "⚠️  等待超时，请手动检查 Stack 状态"
exit 1

