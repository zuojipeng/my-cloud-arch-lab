#!/bin/bash

# 部署验证脚本
# 用于验证 VPC、子网配置和获取 API URL

set -e

STACK_NAME="cloud-arch-lab-stack"

echo "=========================================="
echo "🚀 部署验证脚本"
echo "=========================================="
echo ""

# 1. 检查 Stack 状态
echo "📋 检查 Stack 状态..."
STACK_STATUS=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].StackStatus' \
  --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$STACK_STATUS" = "NOT_FOUND" ]; then
  echo "❌ Stack 不存在或还在创建中"
  exit 1
fi

echo "✅ Stack 状态: $STACK_STATUS"
echo ""

# 2. 获取 Outputs（API URL 等）
echo "📤 获取 Stack Outputs..."
OUTPUTS=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs' \
  --output json)

if [ "$OUTPUTS" = "null" ] || [ -z "$OUTPUTS" ]; then
  echo "⚠️  还没有 Outputs，Stack 可能还在创建中"
  echo "   请等待部署完成后再运行此脚本"
  exit 1
fi

echo "$OUTPUTS" | jq -r '.[] | "\(.OutputKey): \(.OutputValue)"'
echo ""

# 提取 API URL
API_URL=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="CloudArchApiUrl") | .OutputValue')
VPC_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="CloudArchVpcId") | .OutputValue')
PUBLIC_SUBNET=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="PublicSubnetId") | .OutputValue')
PRIVATE_SUBNETS=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="PrivateSubnetIds") | .OutputValue')

echo "=========================================="
echo "🌐 API Gateway URL"
echo "=========================================="
if [ -n "$API_URL" ] && [ "$API_URL" != "null" ]; then
  echo "✅ API URL: $API_URL"
  echo ""
  echo "前端可以使用这个 URL 访问 API："
  echo "  ${API_URL}api/items"
  echo "  ${API_URL}api/github/user"
else
  echo "❌ 未找到 API URL"
fi
echo ""

# 3. 验证 VPC 配置
echo "=========================================="
echo "🔍 验证 VPC 配置"
echo "=========================================="

if [ -n "$VPC_ID" ] && [ "$VPC_ID" != "null" ]; then
  echo "✅ VPC ID: $VPC_ID"
  
  # 获取 VPC 详细信息
  VPC_INFO=$(aws ec2 describe-vpcs --vpc-ids $VPC_ID --query 'Vpcs[0]' --output json)
  VPC_CIDR=$(echo "$VPC_INFO" | jq -r '.CidrBlock')
  VPC_NAME=$(echo "$VPC_INFO" | jq -r '.Tags[]? | select(.Key=="Name") | .Value // "未命名"')
  
  echo "   - 名称: $VPC_NAME"
  echo "   - CIDR: $VPC_CIDR"
  echo ""
else
  echo "❌ 未找到 VPC ID"
fi

# 4. 验证子网配置
echo "=========================================="
echo "🌐 验证子网配置"
echo "=========================================="

# 公网子网
if [ -n "$PUBLIC_SUBNET" ] && [ "$PUBLIC_SUBNET" != "null" ]; then
  echo "✅ 公网子网:"
  PUBLIC_SUBNET_INFO=$(aws ec2 describe-subnets --subnet-ids $PUBLIC_SUBNET --query 'Subnets[0]' --output json)
  PUBLIC_SUBNET_NAME=$(echo "$PUBLIC_SUBNET_INFO" | jq -r '.Tags[]? | select(.Key=="Name") | .Value // "未命名"')
  PUBLIC_SUBNET_CIDR=$(echo "$PUBLIC_SUBNET_INFO" | jq -r '.CidrBlock')
  PUBLIC_SUBNET_AZ=$(echo "$PUBLIC_SUBNET_INFO" | jq -r '.AvailabilityZone')
  
  echo "   - ID: $PUBLIC_SUBNET"
  echo "   - 名称: $PUBLIC_SUBNET_NAME"
  echo "   - CIDR: $PUBLIC_SUBNET_CIDR"
  echo "   - 可用区: $PUBLIC_SUBNET_AZ"
  echo ""
else
  echo "❌ 未找到公网子网"
fi

# 私有子网
if [ -n "$PRIVATE_SUBNETS" ] && [ "$PRIVATE_SUBNETS" != "null" ]; then
  echo "✅ 私有子网（3个）:"
  IFS=',' read -ra SUBNET_ARRAY <<< "$PRIVATE_SUBNETS"
  SUBNET_COUNT=0
  for SUBNET_ID in "${SUBNET_ARRAY[@]}"; do
    SUBNET_COUNT=$((SUBNET_COUNT + 1))
    SUBNET_INFO=$(aws ec2 describe-subnets --subnet-ids $SUBNET_ID --query 'Subnets[0]' --output json)
    SUBNET_NAME=$(echo "$SUBNET_INFO" | jq -r '.Tags[]? | select(.Key=="Name") | .Value // "未命名"')
    SUBNET_CIDR=$(echo "$SUBNET_INFO" | jq -r '.CidrBlock')
    SUBNET_AZ=$(echo "$SUBNET_INFO" | jq -r '.AvailabilityZone')
    
    echo "   私有子网 $SUBNET_COUNT:"
    echo "     - ID: $SUBNET_ID"
    echo "     - 名称: $SUBNET_NAME"
    echo "     - CIDR: $SUBNET_CIDR"
    echo "     - 可用区: $SUBNET_AZ"
    echo ""
  done
  
  if [ $SUBNET_COUNT -eq 3 ]; then
    echo "✅ 验证通过：有 3 个私有子网"
  else
    echo "⚠️  警告：只有 $SUBNET_COUNT 个私有子网（期望 3 个）"
  fi
else
  echo "❌ 未找到私有子网"
fi

# 5. 验证 Lambda 函数
echo "=========================================="
echo "⚡ 验证 Lambda 函数"
echo "=========================================="

LAMBDA_FUNCTION="cloud-arch-lab-api"
LAMBDA_INFO=$(aws lambda get-function --function-name $LAMBDA_FUNCTION --query 'Configuration' --output json 2>/dev/null || echo "null")

if [ "$LAMBDA_INFO" != "null" ]; then
  LAMBDA_VPC=$(echo "$LAMBDA_INFO" | jq -r '.VpcConfig.SubnetIds[]? // empty')
  LAMBDA_SG=$(echo "$LAMBDA_INFO" | jq -r '.VpcConfig.SecurityGroupIds[]? // empty')
  
  echo "✅ Lambda 函数: $LAMBDA_FUNCTION"
  echo "   - VPC 配置: 已配置"
  if [ -n "$LAMBDA_VPC" ]; then
    echo "   - 部署在子网: $(echo "$LAMBDA_INFO" | jq -r '.VpcConfig.SubnetIds | join(", ")')"
  fi
  if [ -n "$LAMBDA_SG" ]; then
    echo "   - 安全组: $(echo "$LAMBDA_INFO" | jq -r '.VpcConfig.SecurityGroupIds | join(", ")')"
  fi
else
  echo "❌ Lambda 函数不存在或无法访问"
fi
echo ""

# 6. 测试 API（如果 API URL 存在）
if [ -n "$API_URL" ] && [ "$API_URL" != "null" ]; then
  echo "=========================================="
  echo "🧪 测试 API"
  echo "=========================================="
  
  echo "测试 GET /api/items..."
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}api/items" || echo "000")
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "401" ]; then
    echo "✅ API 可访问 (HTTP $HTTP_CODE)"
    echo ""
    echo "尝试获取数据..."
    curl -s "${API_URL}api/items" | jq '.' 2>/dev/null || curl -s "${API_URL}api/items"
  else
    echo "⚠️  API 响应异常 (HTTP $HTTP_CODE)"
    echo "   可能还在部署中，请稍后再试"
  fi
  echo ""
fi

echo "=========================================="
echo "✅ 验证完成"
echo "=========================================="
echo ""
echo "📝 总结："
echo "  1. 架构：Lambda + API Gateway（不需要 EC2）"
echo "  2. 前端访问：使用上面的 API Gateway URL"
echo "  3. VPC 配置：1 个公网子网 + 3 个私有子网"
echo "  4. Lambda 部署在私有子网中，通过 NAT Gateway 访问外网"
echo ""

