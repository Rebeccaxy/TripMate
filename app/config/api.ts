import { Platform } from 'react-native';

/**
 * API配置管理
 * 
 * 注意：在生产环境中，API密钥应该存储在环境变量中，而不是直接写在代码里
 * 对于Expo项目，可以使用 expo-constants 和 app.config.js 来管理环境变量
 */

// 后端API配置
// 开发环境：React Native需要使用实际IP地址，不能使用localhost
// iOS模拟器可以使用 localhost 或 127.0.0.1
// Android模拟器需要使用 10.0.2.2
// 真机需要使用电脑的局域网IP地址（如：192.168.1.100）

/**
 * 获取API基础URL
 * 根据运行环境自动选择正确的地址
 */
function getApiBaseUrl(): string {
  if (!__DEV__) {
    return 'https://your-production-api.com/api';
  }
  
  // 开发环境：根据平台选择
  if (Platform.OS === 'ios') {
    return 'http://localhost:3000/api';  // iOS模拟器
  } else {
    return 'http://10.0.2.2:3000/api';   // Android模拟器
  }
}

export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
};

// 通义千问API配置
export const QIANWEN_CONFIG = {
  // API密钥 - 请通过环境变量配置，不要直接写在代码里
  // 获取方式：访问 https://dashscope.aliyun.com/ 注册并获取API Key
  // 配置方法：在项目根目录创建 .env.local 文件，添加 EXPO_PUBLIC_QIANWEN_API_KEY=your-api-key
  API_KEY: process.env.EXPO_PUBLIC_QIANWEN_API_KEY || 'YOUR_QIANWEN_API_KEY_HERE',
  
  // API端点
  // 注意：qwen3-vl-flash 可以使用标准端点，如果遇到问题可以尝试兼容模式端点：
  // 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions'
  API_ENDPOINT: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
  
  // 模型名称 - 可以根据需要选择不同的模型
  // 可选模型：
  // - qwen-turbo: 快速响应，适合对话（推荐，最稳定）
  // - qwen-plus: 平衡性能和速度
  // - qwen-max: 最强性能
  // - qwen3-vl-flash: 视觉语言模型，快速响应（可能有兼容性问题）
  MODEL: 'qwen-turbo', // 暂时使用更稳定的模型
  
  // 请求超时时间（毫秒）
  TIMEOUT: 30000,
};

/**
 * 检查API密钥是否已配置
 */
export function isApiKeyConfigured(): boolean {
  const apiKey = QIANWEN_CONFIG.API_KEY;
  return apiKey !== 'YOUR_QIANWEN_API_KEY_HERE' && 
         apiKey !== undefined &&
         apiKey.trim() !== '';
}

/**
 * 设置API密钥
 * 注意：这个方法仅用于开发测试，生产环境应该使用环境变量
 */
export function setApiKey(apiKey: string): void {
  // 在实际应用中，应该使用更安全的方式存储API密钥
  // 例如使用 expo-secure-store 或 AsyncStorage（虽然AsyncStorage不是完全安全的）
  console.warn('警告：直接设置API密钥不是最佳实践，建议使用环境变量');
  // 这里只是示例，实际应该存储到安全的地方
}

