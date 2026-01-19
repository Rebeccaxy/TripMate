import AsyncStorage from '@react-native-async-storage/async-storage';
import { callQianwenAPI } from './qianwenService';

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
const MAX_MESSAGES = 30;
const MAX_MESSAGE_TEXT_LENGTH = 2000;
const MAX_MESSAGES_JSON_SIZE = 50 * 1024; // 50KB，避免解析超大JSON导致OOM

function normalizeMessagesForStorage(messages: ChatMessage[]): ChatMessage[] {
  const limited = messages.length > MAX_MESSAGES
    ? messages.slice(-MAX_MESSAGES)
    : messages;

  return limited.map((msg) => {
    if (msg.text.length <= MAX_MESSAGE_TEXT_LENGTH) {
      return msg;
    }
    return {
      ...msg,
      text: msg.text.substring(0, MAX_MESSAGE_TEXT_LENGTH) + '\n\n[内容已截断]',
    };
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
    const conversations = await getAllConversations();
    // 检查是否已存在相同 ID 的对话
    const existingIndex = conversations.findIndex((c) => c.id === conversation.id);
    if (existingIndex >= 0) {
      // 如果存在，更新它
      conversations[existingIndex] = conversation;
    } else {
      // 如果不存在，添加到最前面
      conversations.unshift(conversation);
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
      conversations[index] = { ...conversations[index], ...updates };
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
  chatId: string
): Promise<string> {
  const requestId = Date.now();
  const startTime = Date.now();
  
  try {
    if (__DEV__) {
      console.log(`[AI请求] #${requestId} 开始，用户消息长度: ${userMessage.length}字符`);
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
    console.log(`[AI请求] #${requestId} ⏳ 开始等待 callQianwenAPI 返回...`);
    const aiResponse = await callQianwenAPI(userMessage, conversationHistory);
    console.log(`[AI请求] #${requestId} ✅ callQianwenAPI 返回成功`);
    
    const elapsed = Date.now() - startTime;
    if (__DEV__) {
      console.log(`[AI请求] #${requestId} API调用成功，耗时${elapsed}ms，响应长度: ${aiResponse.length}字符`);
    }
    
    const formattedResponse = normalizeMarkdownForDisplay(aiResponse);
    
    if (__DEV__) {
      console.log(`[AI请求] #${requestId} Markdown格式化完成，最终长度: ${formattedResponse.length}字符`);
    }
    
    return formattedResponse;
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[AI请求] #${requestId} 失败，耗时${elapsed}ms:`, error);
    
    // 返回友好的错误提示
    if (error instanceof Error) {
      if (__DEV__) {
        console.error(`[AI请求] #${requestId} 错误详情:`, {
          message: error.message,
          stack: error.stack,
          elapsed,
        });
      }
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
