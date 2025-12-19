import AsyncStorage from '@react-native-async-storage/async-storage';

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
 * 获取对话的消息历史
 */
export async function getChatMessages(chatId: string): Promise<ChatMessage[]> {
  try {
    const messagesJson = await AsyncStorage.getItem(`${MESSAGES_STORAGE_KEY}:${chatId}`);
    if (messagesJson) {
      const messages = JSON.parse(messagesJson);
      // 将 timestamp 字符串转换回 Date 对象
      return messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
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
      JSON.stringify(messages)
    );
  } catch (error) {
    console.error('保存消息历史失败:', error);
  }
}

/**
 * 添加消息到对话
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

