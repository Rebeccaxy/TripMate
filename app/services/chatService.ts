import AsyncStorage from '@react-native-async-storage/async-storage';
import { callQianwenAPI } from './qianwenService';

// 标题最大字数限制
const MAX_TITLE_LENGTH = 20;

// 聊天对话数据类型
export interface ChatConversation {
  id: string;
  title: string;
  summary: string;
  updatedAt: string;
}

// 存储键名
const CONVERSATIONS_STORAGE_KEY = '@tripMate:conversations';
const MESSAGES_STORAGE_KEY = '@tripMate:messages';

// 存储与内存保护阈值
const MAX_MESSAGES = 50; // 增加消息数量限制
const MAX_MESSAGE_TEXT_LENGTH = 100000; // 大幅增加消息文本长度限制，允许更长的完整回复
const MAX_MESSAGES_JSON_SIZE = 1000 * 1024; // 1MB，允许更大的JSON以存储完整对话

function normalizeMessagesForStorage(messages: ChatMessage[]): ChatMessage[] {
  const limited = messages.length > MAX_MESSAGES
    ? messages.slice(-MAX_MESSAGES)
    : messages;

  return limited.map((msg) => {
    // 不再截断消息内容，允许完整保存
    // 只在极端情况下（超过50KB）才截断
    if (msg.text.length > MAX_MESSAGE_TEXT_LENGTH) {
      console.warn(`[消息存储] 消息过长(${msg.text.length}字符)，但允许保存`);
    }
    return msg;
  });
}


export function normalizeMarkdownForDisplay(text: string): string {
  let normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const fenceCount = (normalized.match(/```/g) || []).length;
  if (fenceCount % 2 === 1) {
    normalized += '\n```';
  }

  return normalized;
}




// 消息数据类型
export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

// 默认对话数据
const defaultConversations: ChatConversation[] = [
  {
    id: '1',
    title: '东京三日游行程规划',
    summary: '计划游览浅草寺、东京塔和秋叶原，需要推荐美食和交通路线',
    updatedAt: '2小时前',
  },
  {
    id: '2',
    title: '巴黎浪漫之旅',
    summary: '讨论埃菲尔铁塔、卢浮宫和塞纳河游船的行程安排',
    updatedAt: '1天前',
  },
  {
    id: '3',
    title: '京都和服体验',
    summary: '寻找最佳和服租赁店和拍照地点推荐',
    updatedAt: '3天前',
  },
];

/**
 * 获取所有对话
 */
export async function getAllConversations(): Promise<ChatConversation[]> {
  try {
    const conversationsJson = await AsyncStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    if (conversationsJson) {
      return JSON.parse(conversationsJson);
    }
    // 如果没有存储的数据，返回默认数据
    await saveAllConversations(defaultConversations);
    return defaultConversations;
  } catch (error) {
    console.error('获取对话列表失败:', error);
    return defaultConversations;
  }
}

/**
 * 保存所有对话
 */
export async function saveAllConversations(
  conversations: ChatConversation[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations));
  } catch (error) {
    console.error('保存对话列表失败:', error);
  }
}

/**
 * 添加新对话
 */
export async function addConversation(
  conversation: ChatConversation
): Promise<void> {
  try {
    // 如果标题过长，进行蒸馏
    let finalConversation = conversation;
    if (conversation.title.length > MAX_TITLE_LENGTH) {
      console.log(`[添加对话] 标题过长(${conversation.title.length}字符)，开始蒸馏...`);
      const distilledTitle = await distillTitle(conversation.title, conversation.summary);
      finalConversation = {
        ...conversation,
        title: distilledTitle,
      };
    }

    const conversations = await getAllConversations();
    // 检查是否已存在相同 ID 的对话
    const existingIndex = conversations.findIndex((c) => c.id === finalConversation.id);
    if (existingIndex >= 0) {
      // 如果存在，更新它
      conversations[existingIndex] = finalConversation;
    } else {
      // 如果不存在，添加到最前面
      conversations.unshift(finalConversation);
    }
    await saveAllConversations(conversations);
  } catch (error) {
    console.error('添加对话失败:', error);
  }
}

/**
 * 更新对话
 */
export async function updateConversation(
  id: string,
  updates: Partial<ChatConversation>
): Promise<void> {
  try {
    const conversations = await getAllConversations();
    const index = conversations.findIndex((c) => c.id === id);
    if (index >= 0) {
      // 如果更新了标题且标题过长，进行蒸馏
      let finalUpdates = updates;
      if (updates.title && updates.title.length > MAX_TITLE_LENGTH) {
        console.log(`[更新对话] 标题过长(${updates.title.length}字符)，开始蒸馏...`);
        const currentConversation = conversations[index];
        const distilledTitle = await distillTitle(
          updates.title,
          updates.summary || currentConversation.summary
        );
        finalUpdates = {
          ...updates,
          title: distilledTitle,
        };
      }

      conversations[index] = { ...conversations[index], ...finalUpdates };
      // 更新后移到最前面
      const updated = conversations.splice(index, 1)[0];
      conversations.unshift(updated);
      await saveAllConversations(conversations);
    }
  } catch (error) {
    console.error('更新对话失败:', error);
  }
}

/**
 * 删除对话
 */
export async function deleteConversation(id: string): Promise<void> {
  try {
    const conversations = await getAllConversations();
    const filtered = conversations.filter((c) => c.id !== id);
    await saveAllConversations(filtered);
  } catch (error) {
    console.error('删除对话失败:', error);
  }
}


/**
 * 清空对话的消息历史
 */
export async function clearChatMessages(chatId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${MESSAGES_STORAGE_KEY}:${chatId}`);
  } catch (error) {
    console.error('清理消息历史失败:', error);
  }
}

/**
 * 获取对话的消息历史
 * 限制返回的消息数量，只返回最近50条消息
 */
export async function getChatMessages(chatId: string): Promise<ChatMessage[]> {
  try {
    const messagesJson = await AsyncStorage.getItem(`${MESSAGES_STORAGE_KEY}:${chatId}`);
    if (messagesJson) {
      if (messagesJson.length > MAX_MESSAGES_JSON_SIZE) {
        console.warn('消息历史过大，已清理以避免内存溢出');
        try {
          await AsyncStorage.removeItem(`${MESSAGES_STORAGE_KEY}:${chatId}`);
        } catch (clearError) {
          console.error('清理过大消息历史失败:', clearError);
        }
        return [];
      }
      const messages = JSON.parse(messagesJson);
      // 将 timestamp 字符串转换回 Date 对象
      const parsedMessages = messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
      
      // 限制返回的消息数量，只返回最近50条消息
      return parsedMessages.length > MAX_MESSAGES
        ? parsedMessages.slice(-MAX_MESSAGES)
        : parsedMessages;
    }
    return [];
  } catch (error) {
    console.error('获取消息历史失败:', error);
    return [];
  }
}

/**
 * 保存对话的消息历史
 */
export async function saveChatMessages(
  chatId: string,
  messages: ChatMessage[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${MESSAGES_STORAGE_KEY}:${chatId}`,
      JSON.stringify(normalizeMessagesForStorage(messages))
    );
  } catch (error) {
    console.error('保存消息历史失败:', error);
  }
}

/**
 * 添加消息到对话
 * 限制消息数量，只保留最近50条消息，避免内存溢出
 */
export async function addMessageToChat(
  chatId: string,
  message: ChatMessage
): Promise<void> {
  try {
    const messages = await getChatMessages(chatId);
    messages.push(message);
    await saveChatMessages(chatId, messages);
  } catch (error) {
    console.error('添加消息失败:', error);
  }
}

/**
 * 使用AI蒸馏对话标题，确保标题在固定字数范围内
 * @param originalTitle 原始标题
 * @param summary 对话摘要（可选，用于上下文）
 * @returns 蒸馏后的标题
 */
export async function distillTitle(
  originalTitle: string,
  summary?: string
): Promise<string> {
  // 如果标题已经在限制范围内，直接返回
  if (originalTitle.length <= MAX_TITLE_LENGTH) {
    return originalTitle;
  }

  try {
    console.log(`[标题蒸馏] 开始蒸馏标题，原始长度: ${originalTitle.length}字符`);
    
    // 构建提示词
    const prompt = `请将以下对话标题精简到${MAX_TITLE_LENGTH}个字以内，保持核心意思不变，语言简洁自然：

标题：${originalTitle}
${summary ? `对话摘要：${summary}` : ''}

要求：
1. 标题必须在${MAX_TITLE_LENGTH}个字以内
2. 保留标题的核心信息和关键词
3. 语言自然流畅，不要生硬截断
4. 只返回精简后的标题，不要添加任何解释或说明

精简后的标题：`;

    // 调用AI进行标题蒸馏
    const distilledTitle = await callQianwenAPI(prompt, []);
    
    // 清理AI返回的内容（移除可能的引号、换行等）
    let cleanedTitle = distilledTitle
      .trim()
      .replace(/^["'「」『』]|["'「」『』]$/g, '') // 移除首尾引号
      .replace(/\n+/g, ' ') // 替换换行为空格
      .trim();

    // 如果AI返回的标题仍然过长，进行截断
    if (cleanedTitle.length > MAX_TITLE_LENGTH) {
      console.warn(`[标题蒸馏] AI返回的标题仍然过长(${cleanedTitle.length}字符)，进行截断`);
      cleanedTitle = cleanedTitle.substring(0, MAX_TITLE_LENGTH);
    }

    // 如果AI返回的标题太短或无效，使用简单的截断作为后备
    if (cleanedTitle.length < 3) {
      console.warn(`[标题蒸馏] AI返回的标题太短，使用简单截断作为后备`);
      cleanedTitle = originalTitle.substring(0, MAX_TITLE_LENGTH);
    }

    console.log(`[标题蒸馏] 完成，原始: ${originalTitle}，蒸馏后: ${cleanedTitle} (${cleanedTitle.length}字符)`);
    return cleanedTitle;
  } catch (error) {
    console.error('[标题蒸馏] AI蒸馏失败，使用简单截断:', error);
    // 如果AI调用失败，使用简单的截断作为后备方案
    return originalTitle.length > MAX_TITLE_LENGTH
      ? originalTitle.substring(0, MAX_TITLE_LENGTH - 1) + '…'
      : originalTitle;
  }
}

/**
 * 格式化更新时间
 */
export function formatUpdatedAt(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) {
    return '刚刚';
  } else if (minutes < 60) {
    return `${minutes}分钟前`;
  } else if (hours < 24) {
    return `${hours}小时前`;
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    return date.toLocaleDateString('zh-CN');
  }
}

/**
 * 获取AI回复
 * 这个函数会调用千问API生成回复
 */
export async function getAIResponse(
  userMessage: string,
  chatId: string,
  context?: { itinerary?: any; travelDNA?: any } | null
): Promise<string> {
  const requestId = Date.now();
  const startTime = Date.now();
  
  try {
    console.log(`\n[AI请求] ========== 开始处理AI请求 ==========`);
    console.log(`[AI请求] #${requestId} 时间戳: ${new Date().toISOString()}`);
    console.log(`[AI请求] #${requestId} 用户消息长度: ${userMessage.length}字符`);
    console.log(`[AI请求] #${requestId} 对话ID: ${chatId || '未指定'}`);
    if (context) {
      console.log(`[AI请求] #${requestId} 上下文:`, {
        hasItinerary: !!context.itinerary,
        hasTravelDNA: !!context.travelDNA,
      });
    }

    // 不加载对话历史，避免额外内存占用
    // 完全禁用对话历史以避免内存溢出
    // 在React Native环境中，对话历史会导致严重的内存问题
    const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    
    if (__DEV__) {
      console.log(`[AI请求] #${requestId} 调用千问API...`);
      console.log(`[AI请求] #${requestId} 准备调用 callQianwenAPI 函数...`);
    }
    
    // 调用千问API
    const apiCallStartTime = Date.now();
    console.log(`[AI请求] #${requestId} ⏳ 开始调用 callQianwenAPI...`);
    console.log(`[AI请求] #${requestId} 调用时间: ${new Date().toISOString()}`);
    
    const aiResponse = await callQianwenAPI(userMessage, conversationHistory, context);
    
    const apiCallElapsed = Date.now() - apiCallStartTime;
    const totalElapsed = Date.now() - startTime;
    console.log(`[AI请求] #${requestId} ✅ callQianwenAPI 返回成功`);
    console.log(`[AI请求] #${requestId} API调用耗时: ${apiCallElapsed}ms`);
    console.log(`[AI请求] #${requestId} 总耗时: ${totalElapsed}ms`);
    console.log(`[AI请求] #${requestId} 响应长度: ${aiResponse.length}字符`);
    
    const formattedResponse = normalizeMarkdownForDisplay(aiResponse);
    
    if (__DEV__) {
      console.log(`[AI请求] #${requestId} Markdown格式化完成，最终长度: ${formattedResponse.length}字符`);
    }
    
    return formattedResponse;
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`\n[AI请求] ========== 请求失败 ==========`);
    console.error(`[AI请求] #${requestId} 失败，耗时${elapsed}ms`);
    console.error(`[AI请求] #${requestId} 错误时间: ${new Date().toISOString()}`);
    console.error(`[AI请求] #${requestId} 错误对象:`, error);
    
    // 返回友好的错误提示
    if (error instanceof Error) {
      console.error(`[AI请求] #${requestId} 错误类型: ${error.constructor.name}`);
      console.error(`[AI请求] #${requestId} 错误消息: ${error.message}`);
      if (error.stack) {
        console.error(`[AI请求] #${requestId} 错误堆栈:`, error.stack.substring(0, 500));
      }
      console.error(`[AI请求] #${requestId} 完整错误详情:`, {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 500),
        elapsed,
      });
      // 如果是API密钥未配置的错误，返回特定提示
      if (error.message.includes('API密钥未配置')) {
        return '抱歉，AI服务尚未配置。请在 app/config/api.ts 中设置您的千问API密钥。';
      }
      // 如果是网络错误
      if (error.message.includes('网络')) {
        return '网络连接失败，请检查您的网络设置后重试。';
      }
      // 其他错误
      return `抱歉，AI服务暂时不可用：${error.message}`;
    }
    
    return '抱歉，AI服务暂时不可用，请稍后重试。';
  }
}
