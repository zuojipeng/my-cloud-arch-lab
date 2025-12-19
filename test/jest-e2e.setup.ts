// E2E 测试全局设置
// 在运行测试前执行

// 设置测试超时时间
jest.setTimeout(30000);

// 全局测试前钩子
beforeAll(() => {
  // 确保环境变量已加载
  require('dotenv').config();
});

// 全局测试后钩子
afterAll(() => {
  // 清理工作
});

