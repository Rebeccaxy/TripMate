import { QIANWEN_CONFIG, isApiKeyConfigured } from '@/config/api';
import { getUserPreferences, formatPreferencesAsPrompt } from './userPreferencesService';

// 千问API请求和响应类型
interface QianwenMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface QianwenRequest {
  model: string;
  input: {
    messages: QianwenMessage[];
  };
  parameters: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
  };
}

interface QianwenResponse {
  output: {
    // 标准格式：choices数组
    choices?: Array<{
      message: {
        role: string;
        content: string;
      };
    }>;
    // 直接文本格式（qwen-turbo等模型使用）
    text?: string;
    finish_reason?: string;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  request_id: string;
}

const MAX_RESPONSE_TEXT_SIZE = 20000; // 20KB，进一步降低内存峰值
const MAX_RESPONSE_LENGTH = 2000; // 最多2000字符
const REQUEST_TIMEOUT_MS = 30000; // 30秒超时

// Promise 超时包装（React Native 兼容）
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);
    }),
  ]);
}


interface RequestStatus {
  stage: 'init' | 'sending' | 'waiting' | 'parsing' | 'success' | 'error';
  message: string;
  timestamp: number;
  error?: string;
}

function logRequestStatus(status: RequestStatus): void {
  const elapsed = Date.now() - status.timestamp;
  const prefix = `[请求状态] [${elapsed}ms]`;
  if (status.stage === 'error') {
    console.error(`${prefix} ${status.stage.toUpperCase()}: ${status.message}`, status.error || '');
  } else {
    console.log(`${prefix} ${status.stage.toUpperCase()}: ${status.message}`);
  }
}


function truncateResponseContent(content: string): string {
  if (content.length > MAX_RESPONSE_LENGTH) {
    console.warn(`[警告] 响应过长(${content.length}字符)，截断到${MAX_RESPONSE_LENGTH}字符`);
    return content.substring(0, MAX_RESPONSE_LENGTH) + '\n\n[响应已截断，内容过长]';
  }
  return content;
}


/**
 * 调用千问API生成回复
 * @param userMessage 用户消息
 * @param conversationHistory 对话历史（可选）
 * @returns AI回复内容
 */
export async function callQianwenAPI(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<string> {
  // 立即输出日志，确保函数被调用
  console.log(`\n[千问API] ========== 函数调用开始 ==========`);
  console.log(`[千问API] 时间戳: ${Date.now()}`);
  console.log(`[千问API] 用户消息长度: ${userMessage.length}字符`);
  console.log(`[千问API] 对话历史长度: ${conversationHistory.length}条`);
  
  const functionStartTime = Date.now();

  // 检查API密钥是否已配置
  if (!isApiKeyConfigured()) {
    console.error('[千问API] ❌ API密钥未配置');
    throw new Error(
      '千问API密钥未配置。请在 app/config/api.ts 中设置您的API密钥。\n' +
      '获取方式：访问 https://dashscope.aliyun.com/ 注册并获取API Key'
    );
  }

  console.log(`[千问API] ✅ API密钥已配置`);
  console.log(`[千问API] 端点: ${QIANWEN_CONFIG.API_ENDPOINT}`);
  console.log(`[千问API] 模型: ${QIANWEN_CONFIG.MODEL}`);

  // 记录函数开始时间（用于最终错误日志）
  let requestStartTime: number | undefined;

  try {
    // 获取用户偏好并格式化为系统提示词
    console.log(`[千问API] 开始获取用户偏好...`);
    const preferences = await getUserPreferences();
    console.log(`[千问API] ✅ 用户偏好获取完成`);
    
    console.log(`[千问API] 开始格式化系统提示词...`);
    let systemPrompt = formatPreferencesAsPrompt(preferences);
    console.log(`[千问API] ✅ 系统提示词格式化完成，长度: ${systemPrompt.length}字符`);
    
    // 严格限制系统提示词长度，避免内存溢出
    const maxSystemPromptLength = 200; // 系统提示词最多200字符（最小化）
    if (systemPrompt.length > maxSystemPromptLength) {
      systemPrompt = systemPrompt.substring(0, maxSystemPromptLength) + '...';
    }

    // 构建消息列表（简化系统提示词）
    const messages: QianwenMessage[] = [
      {
        role: 'system',
        content: `你是TripMate旅行助手。${systemPrompt}用中文回复，简洁友好。`,
      },
    ];

    // 完全禁用对话历史以避免内存溢出（只使用当前消息）
    // 在React Native环境中，对话历史会导致严重的内存问题
    
    // 添加当前用户消息（严格限制长度）
    const maxUserMessageLength = 200; // 用户消息最多200字符
    const truncatedUserMessage = userMessage.length > maxUserMessageLength
      ? userMessage.substring(0, maxUserMessageLength) + '...'
      : userMessage;
    
    messages.push({
      role: 'user',
      content: truncatedUserMessage,
    });

    // 构建请求体
    console.log(`[千问API] 开始构建请求体...`);
    const requestBody: QianwenRequest = {
      model: QIANWEN_CONFIG.MODEL,
      input: {
        messages,
      },
      parameters: {
        temperature: 0.7, // 控制回复的随机性，0-1之间，值越大越随机
        max_tokens: 300, // 最大回复长度（最小化以避免内存溢出）
        top_p: 0.9, // 核采样参数
      },
    };
    console.log(`[千问API] ✅ 请求体构建完成，消息数量: ${messages.length}`);

    // 发送请求（带超时和详细日志）
    requestStartTime = Date.now();
    console.log(`[千问API] ========== 准备发送请求 ==========`);

    let response: Response;
    let hasResponse = false;
    let responseStatus = 0;
    let responseHeaders: Headers | null = null;

    try {
      console.log(`[请求状态] [0ms] INIT: 准备发送API请求`);
      console.log(`[请求状态] [0ms] SENDING: 发送请求到 ${QIANWEN_CONFIG.API_ENDPOINT}`);
      console.log(`[请求详情] 请求体大小: ${JSON.stringify(requestBody).length}字符`);
      console.log(`[请求详情] API密钥前6位: ${QIANWEN_CONFIG.API_KEY.substring(0, 6)}...`);

      logRequestStatus({
        stage: 'init',
        message: '准备发送API请求',
        timestamp: requestStartTime,
      });

      logRequestStatus({
        stage: 'sending',
        message: `发送请求到 ${QIANWEN_CONFIG.API_ENDPOINT}`,
        timestamp: requestStartTime,
      });

      // 使用 Promise 超时包装 fetch（React Native 兼容）
      const fetchPromise = fetch(QIANWEN_CONFIG.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${QIANWEN_CONFIG.API_KEY}`,
          'X-DashScope-SSE': 'disable', // 禁用流式输出，使用普通请求
        },
        body: JSON.stringify(requestBody),
      });

      console.log(`[请求状态] fetch Promise 已创建，等待响应（超时: ${REQUEST_TIMEOUT_MS}ms）...`);
      
      response = await withTimeout(
        fetchPromise,
        REQUEST_TIMEOUT_MS,
        `请求超时（${REQUEST_TIMEOUT_MS / 1000}秒），请检查网络连接或API服务状态`
      ) as Response;
      
      const fetchElapsed = Date.now() - requestStartTime;
      console.log(`[请求状态] [${fetchElapsed}ms] fetch 完成，收到响应，状态码: ${response.status}`);

      hasResponse = true;
      responseStatus = response.status;
      responseHeaders = response.headers;

      logRequestStatus({
        stage: 'waiting',
        message: `收到响应，状态码: ${response.status}`,
        timestamp: requestStartTime,
      });

    } catch (fetchError: any) {
      const elapsed = Date.now() - requestStartTime;
      console.error(`[请求状态] [${elapsed}ms] ERROR: fetch 异常`, fetchError);
      console.error(`[请求错误] 错误类型: ${fetchError?.name || typeof fetchError}`);
      console.error(`[请求错误] 错误消息: ${fetchError?.message || String(fetchError)}`);
      
      if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted') || fetchError.message?.includes('超时')) {
        const elapsed = Date.now() - requestStartTime;
        logRequestStatus({
          stage: 'error',
          message: `请求超时（${elapsed}ms > ${REQUEST_TIMEOUT_MS}ms）`,
          timestamp: requestStartTime,
          error: 'TIMEOUT',
        });
        throw new Error(`请求超时（${REQUEST_TIMEOUT_MS / 1000}秒），请检查网络连接或稍后重试`);
      }

      logRequestStatus({
        stage: 'error',
        message: '网络请求失败',
        timestamp: requestStartTime,
        error: fetchError.message || String(fetchError),
      });
      
      console.error('网络请求失败详情:', {
        error: fetchError,
        hasResponse,
        responseStatus,
        url: QIANWEN_CONFIG.API_ENDPOINT,
      });
      
      throw new Error(`网络连接失败: ${fetchError.message || '未知错误'}，请检查您的网络设置`);
    }

    if (!response.ok) {
      logRequestStatus({
        stage: 'error',
        message: `HTTP错误响应: ${response.status} ${response.statusText}`,
        timestamp: requestStartTime,
        error: `HTTP_${response.status}`,
      });

      let errorData: any = {};
      let errorText = '';
      try {
        errorText = await response.text();
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
      } catch (parseError) {
        console.error('解析错误响应失败:', parseError);
        errorData = { message: `无法解析错误响应: ${parseError}` };
      }
      
      const errorMessage = errorData.message || errorData.error?.message || '未知错误';
      console.error('API错误响应详情:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        errorTextPreview: errorText.substring(0, 500),
      });
      
      throw new Error(
        `千问API请求失败 (${response.status}): ${errorMessage}`
      );
    }

    let data: QianwenResponse;
    let responseText: string = '';
    const maxResponseSize = MAX_RESPONSE_TEXT_SIZE;
    try {
      logRequestStatus({
        stage: 'parsing',
        message: '开始解析响应',
        timestamp: requestStartTime,
      });

      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader && Number(contentLengthHeader) > maxResponseSize) {
        logRequestStatus({
          stage: 'error',
          message: `响应过大（Content-Length: ${contentLengthHeader} > ${maxResponseSize}）`,
          timestamp: requestStartTime,
          error: 'RESPONSE_TOO_LARGE',
        });
        throw new Error('API响应过大，请稍后重试');
      }

      const textStartTime = Date.now();
      responseText = await response.text();
      const textElapsed = Date.now() - textStartTime;
      
      logRequestStatus({
        stage: 'parsing',
        message: `读取响应文本完成（${responseText.length}字符，耗时${textElapsed}ms）`,
        timestamp: requestStartTime,
      });
      
      // 限制响应文本大小，避免内存溢出
      if (responseText.length > maxResponseSize) {
        console.warn(`API响应过大(${responseText.length}字符)，截断处理`);
        responseText = responseText.substring(0, maxResponseSize);
      }
      
      const parseStartTime = Date.now();
      data = JSON.parse(responseText);
      const parseElapsed = Date.now() - parseStartTime;
      
      logRequestStatus({
        stage: 'parsing',
        message: `JSON解析完成（耗时${parseElapsed}ms）`,
        timestamp: requestStartTime,
      });
      
    } catch (parseError: any) {
      const elapsed = Date.now() - requestStartTime;
      logRequestStatus({
        stage: 'error',
        message: '解析API响应失败',
        timestamp: requestStartTime,
        error: parseError.message || String(parseError),
      });
      
      console.error('解析API响应失败详情:', {
        error: parseError,
        responseTextLength: responseText?.length || 0,
        responseTextPreview: responseText?.substring(0, 500) || '无法获取响应内容',
        elapsed,
      });
      
      throw new Error(`API返回数据格式异常: ${parseError.message || '解析失败'}，请稍后重试`);
    }

    // 提取回复内容 - 支持多种可能的响应格式
    // 优先检查 text 字段（qwen-turbo等模型的标准格式）
    if (data.output?.text) {
      const response = data.output.text;
      
      // 🔴 关键诊断：检查原始响应大小
      const responseSize = response.length;
      const responseSizeKB = (responseSize / 1024).toFixed(2);
      if (__DEV__) {
        console.log(`[诊断] API原始响应大小: ${responseSize} 字符 (${responseSizeKB} KB)`);
      }
      
      // 严格限制响应长度，避免内存溢出
      // 增加到2KB字符（约4KB内存），但保持硬上限
      const maxResponseLength = 2000; // 最多2000字符
      if (response.length > maxResponseLength) {
        console.warn(`[警告] 响应过长(${response.length}字符)，截断到${maxResponseLength}字符`);
        return response.substring(0, maxResponseLength) + '\n\n[响应已截断，内容过长]';
      }
      return response;
    } 
    // 检查 choices 格式（某些模型可能使用）
    else if (data.output?.choices?.[0]?.message?.content) {
      return truncateResponseContent(data.output.choices[0].message.content);
    } 
    // 兼容OpenAI格式
    else if ((data as any).choices?.[0]?.message?.content) {
      return truncateResponseContent((data as any).choices[0].message.content);
    } 
    // 如果都没有，记录详细错误信息
    else {
      const outputKeys = data.output ? Object.keys(data.output) : [];
      console.error('API响应格式异常，关键字段:', {
        hasOutput: !!data.output,
        outputKeys,
      });
      throw new Error('API返回格式异常，无法提取回复内容。请检查API响应格式。');
    }
  } catch (error) {
    // 如果 requestStartTime 存在，记录最终错误状态
    if (typeof requestStartTime !== 'undefined') {
      const finalElapsed = Date.now() - requestStartTime;
      logRequestStatus({
        stage: 'error',
        message: `请求最终失败（总耗时${finalElapsed}ms）`,
        timestamp: requestStartTime,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    console.error('调用千问API失败详情:', {
      error,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    
    // 如果是网络错误或超时
    if (error instanceof TypeError) {
      if (error.message.includes('fetch') || error.message.includes('Network')) {
        throw new Error('网络连接失败，请检查您的网络设置');
      }
    }
    
    // 如果是API密钥错误
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        throw new Error('API密钥无效，请检查您的API密钥配置');
      }
      if (error.message.includes('403') || error.message.includes('Forbidden')) {
        throw new Error('API访问被拒绝，请检查您的API权限或配额');
      }
      if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
        throw new Error('请求过于频繁，请稍后再试');
      }
      if (error.message.includes('超时') || error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
        // 超时错误已经在上面处理过了，直接抛出
        throw error;
      }
      // 直接抛出已知的错误消息
      throw error;
    }
    
    // 其他未知错误
    throw new Error('调用AI服务失败，请稍后重试');
  }
}

/**
 * 流式调用千问API（可选功能，用于实时显示回复）
 * 注意：当前实现使用非流式，如果需要流式输出，需要修改API调用方式
 */
export async function* callQianwenAPIStream(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): AsyncGenerator<string, void, unknown> {
  // 流式调用需要启用SSE，这里先提供接口，后续可以扩展
  // 当前先使用非流式调用
  const response = await callQianwenAPI(userMessage, conversationHistory);
  yield response;
}

