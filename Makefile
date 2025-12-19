.PHONY: help install build build-lambda sam-build sam-deploy sam-local sam-validate clean

help: ## 显示帮助信息
	@echo "可用命令:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## 安装依赖
	pnpm install
	npx prisma generate

build: ## 构建 NestJS 应用
	pnpm build

build-lambda: ## 构建 Lambda 部署包（包含 Prisma Client）
	@bash scripts/build-for-lambda.sh

sam-validate: ## 验证 SAM 模板
	sam validate

sam-build: build-lambda ## 构建 SAM 应用
	sam build
	@echo ""
	@echo "🔧 优化 Lambda 构建包..."
	@bash scripts/build-lambda-production.sh

sam-deploy: sam-build ## 部署到 AWS（引导式）
	sam deploy --guided

sam-deploy-prod: sam-build ## 部署到 AWS（使用配置文件）
	sam deploy --parameter-overrides file://sam-parameters.json

sam-local: sam-build ## 本地启动 API Gateway
	sam local start-api

clean: ## 清理构建产物
	rm -rf dist
	rm -rf .aws-sam
	rm -rf node_modules/.cache

