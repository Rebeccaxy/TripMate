import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Markdown from 'react-native-markdown-display';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import * as SystemUI from 'expo-system-ui';
import * as Clipboard from 'expo-clipboard';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  addConversation,
  updateConversation,
  getAllConversations,
  getChatMessages,
  saveChatMessages,
  addMessageToChat,
  deleteConversation,
  clearChatMessages,
  formatUpdatedAt,
  normalizeMarkdownForDisplay,
  type ChatConversation,
  type ChatMessage,
} from '@/services/chatService';

// 模拟初始消息数据
const getInitialMessages = (chatId: string): ChatMessage[] => {
  // 根据不同的 chatId 返回不同的初始消息
  const messages: Record<string, ChatMessage[]> = {
    '1': [
      {
        id: '1',
        text: '你好！我想规划一个东京三日游的行程，你能帮我吗？',
        isUser: true,
        timestamp: new Date(Date.now() - 3600000),
      },
      {
        id: '2',
        text: '当然可以！我很乐意帮您规划东京三日游。请告诉我您的兴趣偏好，比如您更喜欢传统文化、现代都市、美食体验还是购物？',
        isUser: false,
        timestamp: new Date(Date.now() - 3500000),
      },
      {
        id: '3',
        text: '我对传统文化和美食比较感兴趣，特别是想体验一下和服和日式料理。',
        isUser: true,
        timestamp: new Date(Date.now() - 3400000),
      },
      {
        id: '4',
        text: '太好了！基于您的兴趣，我为您推荐以下行程：\n\n第一天：浅草寺 → 和服体验 → 传统日式料理午餐 → 东京塔\n第二天：上野公园 → 秋叶原 → 银座购物\n第三天：筑地市场 → 皇居 → 新宿御苑\n\n需要我详细说明每个景点的交通路线吗？',
        isUser: false,
        timestamp: new Date(Date.now() - 3300000),
      },
    ],
    '2': [
      {
        id: '1',
        text: '我想去巴黎旅行，有什么推荐吗？',
        isUser: true,
        timestamp: new Date(Date.now() - 86400000),
      },
      {
        id: '2',
        text: '巴黎是一个浪漫的城市！我推荐您游览埃菲尔铁塔、卢浮宫和塞纳河。需要我为您规划详细的行程吗？',
        isUser: false,
        timestamp: new Date(Date.now() - 86300000),
      },
    ],
    '3': [
      {
        id: '1',
        text: '我想在京都体验和服，有什么好的推荐吗？',
        isUser: true,
        timestamp: new Date(Date.now() - 259200000),
      },
      {
        id: '2',
        text: '京都有很多优质的和服租赁店，我推荐清水寺附近的和服店，那里交通便利，而且可以在古色古香的街道上拍照。需要我为您推荐具体的店铺吗？',
        isUser: false,
        timestamp: new Date(Date.now() - 259100000),
      },
    ],
  };
  return messages[chatId] || [];
};

export default function ChatDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id, initialMessage } = useLocalSearchParams<{ id: string; initialMessage?: string }>();
  // 限制消息数组大小，避免内存溢出
  const MAX_MESSAGES_IN_MEMORY = 30;
  const AI_RESPONSE_TIMEOUT_MS = 20000;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasAutoReplied, setHasAutoReplied] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

  // 加载消息历史
  useEffect(() => {
    const loadMessages = async () => {
      if (!id) return;
      
      setIsLoadingMessages(true);
      try {
        const savedMessages = await getChatMessages(id);
        
        if (savedMessages.length > 0) {
          // 如果有保存的消息，使用保存的消息（已限制数量）
          // 进一步限制内存中的消息数量
          const limitedMessages = savedMessages.length > MAX_MESSAGES_IN_MEMORY
            ? savedMessages.slice(-MAX_MESSAGES_IN_MEMORY)
            : savedMessages;
          setMessages(limitedMessages);
        } else if (initialMessage) {
          // 如果是新聊天且有初始消息，创建第一条用户消息
          const firstMessage: ChatMessage = {
            id: Date.now().toString(),
            text: initialMessage,
            isUser: true,
            timestamp: new Date(),
          };
          setMessages([firstMessage]);
          await addMessageToChat(id, firstMessage);
        } else {
          // 否则使用默认消息（仅用于演示的旧对话）
          const defaultMessages = getInitialMessages(id);
          if (defaultMessages.length > 0) {
            setMessages(defaultMessages);
            await saveChatMessages(id, defaultMessages);
          }
        }
      } catch (error) {
        console.error('加载消息失败:', error);
        // 如果加载失败，使用默认消息
        const defaultMessages = getInitialMessages(id || '1');
        setMessages(defaultMessages);
      } finally {
        setIsLoadingMessages(false);
      }
    };
    
    loadMessages();
  }, [id, initialMessage]);
  const [inputText, setInputText] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerSearchQuery, setDrawerSearchQuery] = useState('');
  const [drawerTopics, setDrawerTopics] = useState<ChatConversation[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  
  const [currentChat, setCurrentChat] = useState<ChatConversation>({
    id: id || 'new',
    title: initialMessage || 'New Chat',
    summary: initialMessage || '',
    updatedAt: '刚刚',
  });

  // 加载或创建对话信息
  useEffect(() => {
    const loadChatInfo = async () => {
      if (initialMessage && id) {
        // 创建新对话
        const newChat: ChatConversation = {
          id: id,
          title: initialMessage.length > 30 ? initialMessage.substring(0, 30) + '...' : initialMessage,
          summary: initialMessage,
          updatedAt: formatUpdatedAt(new Date()),
        };
        setCurrentChat(newChat);
        await addConversation(newChat);
      }
    };
    loadChatInfo();
  }, [id, initialMessage]);

  // 隐藏导航栏
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
      header: () => null,
    });
  }, [navigation]);
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor(
    { light: '#E5E5E5', dark: '#333333' },
    'background'
  );
  const botBubbleColor = useThemeColor(
    { light: '#E5E5E5', dark: '#2C2C2E' },
    'background'
  );
  const botTextColor = useThemeColor(
    { light: '#333333', dark: '#FFFFFF' },
    'text'
  );
  const inputBorderColor = useThemeColor(
    { light: '#E5E5E5', dark: '#48484A' },
    'background'
  );
  const insets = useSafeAreaInsets();

  // 加载话题列表
  useEffect(() => {
    const loadTopics = async () => {
      const allTopics = await getAllConversations();
      setDrawerTopics(allTopics);
    };
    if (drawerVisible) {
      loadTopics();
    }
  }, [drawerVisible]);

  // 打开抽屉
  const openDrawer = () => {
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // 关闭抽屉
  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDrawerVisible(false);
      setDrawerSearchQuery(''); // 关闭抽屉时清空搜索
    });
  };

  // 处理话题选择
  const handleTopicSelect = (topicId: string) => {
    if (topicId !== id) {
      router.replace(`/chat/${topicId}`);
    }
    closeDrawer();
  };

  // 处理开始新对话：生成唯一ID，避免一直使用固定的 "new"
  const handleNewChat = () => {
    const newId = Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8);
    router.push(`/chat/${newId}`);
  };

  // 处理退出
  const handleExit = () => {
    // 使用 router.back() 来触发转场动画
    // 如果是从新聊天页面来的，新聊天界面已经被replace掉了，所以直接back会回到列表页
    router.back();
  };


  // 清空聊天记录（保留对话）
  const handleClearMessages = () => {
    Alert.alert(
      '清空聊天记录',
      '仅清空当前对话的消息记录，对话本身会保留。确定继续吗？',
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '清空',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            await clearChatMessages(id);
            setMessages([]);
            setInputText('');
            setHasAutoReplied(false);
            updateConversation(id, {
              updatedAt: formatUpdatedAt(new Date()),
              summary: '已清空对话记录',
            });
          },
        },
      ],
      { cancelable: true }
    );
  };

  // 处理删除对话
  const handleDelete = () => {
    Alert.alert(
      '删除对话',
      '确定要删除这个对话吗？删除后将无法恢复。',
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            if (id) {
              await deleteConversation(id);
              // 使用 router.back() 来触发转场动画
              // 当前屏幕会向右滑出，列表页会从下方出现
              router.back();
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // 隐藏导航栏
  useEffect(() => {
    SystemUI.setBackgroundColorAsync('#007A8C');
    return () => {
      SystemUI.setBackgroundColorAsync('transparent');
    };
  }, []);

  // 滚动到底部 - 使用ref避免清理问题
  const scrollTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    if (messages.length > 0) {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100) as unknown as number;
    }
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [messages.length]);

  // 请求计数器，用于诊断无限循环
  const requestCountRef = useRef(0);
  
  // 确保新对话在存储中创建，避免“new”对话没有持久化
  const ensureConversationExists = async (chatId: string, firstMessage: string) => {
    try {
      const all = await getAllConversations();
      const exists = all.some((c) => c.id === chatId);
      if (!exists) {
        const newConversation: ChatConversation = {
          id: chatId,
          title: firstMessage.length > 30 ? firstMessage.slice(0, 30) + '...' : firstMessage,
          summary: firstMessage,
          updatedAt: formatUpdatedAt(new Date()),
        };
        await addConversation(newConversation);
      }
    } catch (error) {
      console.error('创建新对话失败:', error);
    }
  };

  const handleSend = async () => {
    if (inputText.trim() === '') return;

    // 如果当前是临时/new路由，先生成正式ID并替换路由，避免无效对话ID导致存储失败
    let effectiveId = id;
    if (!effectiveId || effectiveId === 'new') {
      effectiveId = Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8);
      router.replace(`/chat/${effectiveId}`);
    }

    // 诊断：检查是否触发多次
    requestCountRef.current += 1;
    const currentRequestId = requestCountRef.current;
    if (__DEV__) {
      console.log(`[诊断] 发送消息 #${currentRequestId}`);
    }

    const messageText = inputText.trim();

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    // 限制消息数组大小，只保留最近的消息
    setMessages((prev) => {
      const newMessages = [...prev, userMessage];
      return newMessages.length > MAX_MESSAGES_IN_MEMORY
        ? newMessages.slice(-MAX_MESSAGES_IN_MEMORY)
        : newMessages;
    });
    setInputText('');

    // 保存用户消息到存储（先确保对话存在）
    if (effectiveId) {
      await ensureConversationExists(effectiveId, messageText);
      await addMessageToChat(effectiveId, userMessage);
      
      // 更新对话的更新时间
      updateConversation(effectiveId, {
        updatedAt: formatUpdatedAt(new Date()),
        summary: messageText.length > 50 
          ? messageText.substring(0, 50) + '...' 
          : messageText,
      });
    }

    // 调用AI生成回复
    const loadingMessageId = Date.now().toString() + '-loading';
    const botMessageId = Date.now().toString() + '-bot';
    
    // 先显示加载消息
    const loadingMessage: ChatMessage = {
      id: loadingMessageId,
      text: '正在思考中...',
      isUser: false,
      timestamp: new Date(),
    };
    // 限制消息数组大小
    setMessages((prev) => {
      const newMessages = [...prev, loadingMessage];
      return newMessages.length > MAX_MESSAGES_IN_MEMORY
        ? newMessages.slice(-MAX_MESSAGES_IN_MEMORY)
        : newMessages;
    });
    
    // 异步调用AI服务 - 使用简单的async函数，避免复杂的Promise链
    (async () => {
      try {
        console.log('开始调用AI服务...');
        
        // 动态导入getAIResponse函数
        const { getAIResponse } = await import('@/services/chatService');
        
        // 调用AI服务
        if (__DEV__) {
          console.log(`[诊断] 请求 #${currentRequestId} 开始调用AI服务...`);
        }
        
        // 为AI请求添加超时兜底，避免无响应时一直卡住
        const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number) =>
          Promise.race<T>([
            promise,
            new Promise<T>((_, reject) =>
              setTimeout(() => reject(new Error('AI回复超时，请稍后重试')), timeoutMs)
            ),
          ]);

        let aiResponse = await withTimeout(
          getAIResponse(messageText, effectiveId || ''),
          AI_RESPONSE_TIMEOUT_MS
        );
        
        // 🔴 关键诊断：检查响应大小
        const responseSize = aiResponse.length;
        const responseSizeKB = (responseSize / 1024).toFixed(2);
        if (__DEV__) {
          console.log(`[诊断] 请求 #${currentRequestId} AI回复大小: ${responseSize} 字符 (${responseSizeKB} KB)`);
        }
        
        // ⚠️ 如果响应过大，记录警告并截断
        const MAX_RESPONSE_LENGTH = 2000; // 增加到2KB字符（约4KB内存）
        if (responseSize > MAX_RESPONSE_LENGTH) {
          console.warn(`[警告] 响应过大(${responseSize}字符)，截断到${MAX_RESPONSE_LENGTH}字符`);
          aiResponse = aiResponse.substring(0, MAX_RESPONSE_LENGTH) + '\n\n[响应已截断，内容过长]';
        }
        
        // 检查组件是否仍然挂载
        if (!id) {
          console.log('组件已卸载，跳过状态更新');
          return;
        }
        
        // 🔴 关键诊断：在 setState 之前检查数据大小
        const botMessage: ChatMessage = {
          id: botMessageId,
          text: aiResponse,
          isUser: false,
          timestamp: new Date(),
        };
        
        // 检查消息对象大小（估算）
        const messageSizeEstimate = JSON.stringify(botMessage).length;
        if (__DEV__) {
          console.log(`[诊断] 请求 #${currentRequestId} 准备setState，消息对象大小: ${messageSizeEstimate} 字符`);
        }
        
        // 使用更轻量级的状态更新方式
        setMessages((prev) => {
          // 创建新数组，但只保留必要的消息
          const newMessages: ChatMessage[] = [];
          for (let i = 0; i < prev.length; i++) {
            if (prev[i].id !== loadingMessageId) {
              newMessages.push(prev[i]);
            }
          }
          newMessages.push(botMessage);
          
          // 限制消息数组大小
          const limitedMessages = newMessages.length > MAX_MESSAGES_IN_MEMORY
            ? newMessages.slice(-MAX_MESSAGES_IN_MEMORY)
            : newMessages;
          
          if (__DEV__) {
            console.log(`[诊断] 请求 #${currentRequestId} setState完成，消息总数: ${limitedMessages.length}`);
          }
          
          return limitedMessages;
        });
        
        // 延迟保存到存储，避免阻塞UI
        setTimeout(async () => {
          if (!id) return;
          try {
            await addMessageToChat(id, {
              id: botMessageId,
              text: aiResponse,
              isUser: false,
              timestamp: new Date(),
            });
          } catch (saveError) {
            console.error('保存AI回复失败:', saveError);
          }
        }, 100);
      } catch (error) {
        console.error('获取AI回复失败:', error);
        
        // 显示简化的错误消息
        const errorText = error instanceof Error && error.message.length < 50
          ? error.message
          : '服务暂时不可用';
        
        try {
          setMessages((prev) => {
            const newMessages: ChatMessage[] = [];
            for (let i = 0; i < prev.length; i++) {
              if (prev[i].id !== loadingMessageId) {
                newMessages.push(prev[i]);
              }
            }
            newMessages.push({
              id: Date.now().toString() + '-error',
              text: `错误：${errorText}`,
              isUser: false,
              timestamp: new Date(),
            });
            return newMessages;
          });
        } catch (setStateError) {
          console.error('设置错误消息失败:', setStateError);
        }
      }
    })();
  };

  // 如果有初始消息且是新聊天，自动发送机器人回复
  // 注意：需要在 messages 从空 -> 第一条用户消息 时触发一次
  useEffect(() => {
    if (
      initialMessage &&
      messages.length === 1 &&
      messages[0].isUser &&
      messages[0].text === initialMessage &&
      !hasAutoReplied &&
      id
    ) {
      setHasAutoReplied(true);
      
      // 调用AI生成回复
      const generateAutoReply = async () => {
        try {
          const loadingMessageId = Date.now().toString() + '-loading';
          const botMessageId = Date.now().toString() + '-bot';
          
          // 先显示加载消息
          const loadingMessage: ChatMessage = {
            id: loadingMessageId,
            text: '正在思考中...',
            isUser: false,
            timestamp: new Date(),
          };
          setMessages((prev) => {
            const newMessages: ChatMessage[] = [];
            for (let i = 0; i < prev.length; i++) {
              newMessages.push(prev[i]);
            }
            newMessages.push(loadingMessage);
            // 限制消息数组大小
            return newMessages.length > MAX_MESSAGES_IN_MEMORY
              ? newMessages.slice(-MAX_MESSAGES_IN_MEMORY)
              : newMessages;
          });
          
          // 动态导入getAIResponse函数
          const { getAIResponse } = await import('@/services/chatService');
          
          // 调用AI服务（加超时兜底）
          const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number) =>
            Promise.race<T>([
              promise,
              new Promise<T>((_, reject) =>
                setTimeout(() => reject(new Error('AI回复超时，请稍后重试')), timeoutMs)
              ),
            ]);

          let aiResponse = await withTimeout(getAIResponse(initialMessage, id), AI_RESPONSE_TIMEOUT_MS);
          
          // 🔴 关键诊断：检查响应大小
          const responseSize = aiResponse.length;
          if (__DEV__) {
            console.log(`[诊断] 自动回复响应大小: ${responseSize} 字符`);
          }
          
          // 截断响应，避免内存溢出
          const maxResponseLength = 2000; // 增加到2KB字符
          if (aiResponse.length > maxResponseLength) {
            console.warn(`[警告] 自动回复响应过长(${aiResponse.length}字符)，截断到${maxResponseLength}字符`);
            aiResponse = aiResponse.substring(0, maxResponseLength) + '\n\n[响应已截断，内容过长]';
          }
          
          // 移除加载消息，添加真实回复
          setMessages((prev) => {
            const newMessages: ChatMessage[] = [];
            for (let i = 0; i < prev.length; i++) {
              if (prev[i].id !== loadingMessageId) {
                newMessages.push(prev[i]);
              }
            }
            newMessages.push({
              id: botMessageId,
              text: aiResponse,
              isUser: false,
              timestamp: new Date(),
            });
            // 限制消息数组大小
            return newMessages.length > MAX_MESSAGES_IN_MEMORY
              ? newMessages.slice(-MAX_MESSAGES_IN_MEMORY)
              : newMessages;
          });
          
          // 延迟保存到存储
          setTimeout(async () => {
            if (!id) return;
            try {
              await addMessageToChat(id, {
                id: botMessageId,
                text: aiResponse,
                isUser: false,
                timestamp: new Date(),
              });
            } catch (saveError) {
              console.error('保存AI回复失败:', saveError);
            }
          }, 100);
        } catch (error) {
          console.error('获取AI回复失败:', error);
          
          // 显示简化的错误消息
          const errorText = error instanceof Error && error.message.length < 50
            ? error.message
            : '服务暂时不可用';
          
          setMessages((prev) => {
            const newMessages: ChatMessage[] = [];
            for (let i = 0; i < prev.length; i++) {
              if (!prev[i].text.includes('正在思考中')) {
                newMessages.push(prev[i]);
              }
            }
            newMessages.push({
              id: Date.now().toString() + '-error',
              text: `错误：${errorText}`,
              isUser: false,
              timestamp: new Date(),
            });
            // 限制消息数组大小
            return newMessages.length > MAX_MESSAGES_IN_MEMORY
              ? newMessages.slice(-MAX_MESSAGES_IN_MEMORY)
              : newMessages;
          });
        }
      };
      
      generateAutoReply();
    }
  }, [initialMessage, hasAutoReplied, id, messages.length, messages[0]?.text, messages[0]?.isUser]);

  // 复制消息文本
  const handleCopyMessage = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('已复制', '消息已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      Alert.alert('复制失败', '无法复制消息，请稍后重试');
    }
  };

  // 粘贴文本到输入框
  const handlePaste = async () => {
    try {
      const hasContent = await Clipboard.hasStringAsync();
      if (!hasContent) {
        Alert.alert('剪贴板为空', '没有可粘贴的内容');
        return;
      }
      const text = await Clipboard.getStringAsync();
      if (text) {
        setInputText((prev) => prev + text);
      } else {
        Alert.alert('剪贴板为空', '没有可粘贴的内容');
      }
    } catch (error) {
      console.error('粘贴失败:', error);
      Alert.alert('粘贴失败', '无法读取剪贴板内容');
    }
  };


  const shouldRenderMarkdown = (text: string): boolean => {
    // 简单兜底：过长或代码块太多时降级为纯文本，避免渲染耗时/内存爆
    const maxMarkdownLength = 1800;
    const maxCodeFenceCount = 6;
    if (text.length > maxMarkdownLength) return false;
    const fenceCount = (text.match(/```/g) || []).length;
    if (fenceCount > maxCodeFenceCount) return false;
    return true;
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const displayText = item.isUser
      ? item.text
      : normalizeMarkdownForDisplay(item.text);
    const renderAsMarkdown = !item.isUser && shouldRenderMarkdown(displayText);

    return (
      <View
        style={[
          styles.messageContainer,
          item.isUser ? styles.userMessageContainer : styles.botMessageContainer,
        ]}>
        <Pressable
          style={[
            styles.messageBubble,
            item.isUser
              ? styles.userBubble
              : [styles.botBubble, { backgroundColor: botBubbleColor }],
          ]}
          onLongPress={() => handleCopyMessage(displayText)}
          delayLongPress={500}>
          {item.isUser || !renderAsMarkdown ? (
            <ThemedText
              style={[
                styles.messageText,
                item.isUser
                  ? styles.userMessageText
                  : [styles.botMessageText, { color: botTextColor }],
              ]}>
              {displayText}
            </ThemedText>
          ) : (
            <Markdown
              style={{
                body: [styles.messageText, styles.markdownBody, { color: botTextColor }],
                paragraph: styles.markdownParagraph,
                code_block: styles.markdownCodeBlock,
                code_inline: styles.markdownInlineCode,
                link: styles.markdownLink,
                list_item: styles.markdownListItem,
              }}>
              {displayText}
            </Markdown>
          )}
          <View style={styles.messageActions}>
            <TouchableOpacity
              style={styles.messageActionButton}
              onPress={() => handleCopyMessage(displayText)}
              activeOpacity={0.7}>
              <MaterialIcons name="content-copy" size={14} color="#3F99A6" />
              <ThemedText style={styles.messageActionText}>复制</ThemedText>
            </TouchableOpacity>
          </View>
        </Pressable>
      </View>
    );
  };

  // 搜索框组件（独立组件，避免重新渲染）
  const SearchInput = React.memo(({
    searchQuery,
    onSearchQueryChange,
    textColor,
  }: {
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
    textColor: string;
  }) => {
    const inputRef = useRef<TextInput>(null);
    const [localValue, setLocalValue] = useState(searchQuery);
    const timeoutRef = useRef<number | null>(null);

    // 同步外部值到本地
    useEffect(() => {
      if (searchQuery !== localValue) {
        setLocalValue(searchQuery);
      }
    }, [searchQuery]);

    const handleChangeText = (text: string) => {
      setLocalValue(text);
      
      // 清除之前的定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // 延迟更新父组件状态，避免频繁重新渲染
      timeoutRef.current = setTimeout(() => {
        onSearchQueryChange(text);
      }, 100) as unknown as number;
    };

    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    return (
      <View style={styles.drawerSearchWrapper}>
        <View style={styles.drawerSearchContainer}>
          <MaterialIcons name="search" size={20} color="#3F99A6" style={styles.drawerSearchIcon} />
          <TextInput
            ref={inputRef}
            key="search-input"
            style={[styles.drawerSearchInput, { color: textColor }]}
            value={localValue}
            onChangeText={handleChangeText}
            placeholder="搜索对话..."
            placeholderTextColor="#3F99A6"
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="never"
            blurOnSubmit={false}
          />
          {localValue.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setLocalValue('');
                onSearchQueryChange('');
              }}
              style={styles.drawerClearButton}>
              <MaterialIcons name="close" size={18} color="#3F99A6" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, (prevProps, nextProps) => {
    // 自定义比较函数，只在 textColor 变化时重新渲染
    return prevProps.textColor === nextProps.textColor;
  });

  // 话题列表组件
  const TopicList = React.memo(({
    chatId,
    onTopicSelect,
    searchQuery,
    topics,
  }: {
    chatId: string;
    onTopicSelect: (topicId: string) => void;
    searchQuery: string;
    topics: ChatConversation[];
  }) => {
    const topicBorderColor = useThemeColor(
      { light: '#E5E5E5', dark: '#333333' },
      'background'
    );
    const topicIconColor = useThemeColor({}, 'icon');

    // 使用 useMemo 优化搜索过滤，避免不必要的重新渲染
    const filteredTopics = React.useMemo(() => {
      if (searchQuery.trim() === '') {
        return topics;
      }
      return topics.filter(
        (topic) =>
          topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          topic.summary.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }, [searchQuery, topics]);

    const renderTopicItem = React.useCallback(({ item }: { item: ChatConversation }) => {
      const isActive = item.id === chatId;
      return (
        <Pressable
          style={({ pressed }) => [
            styles.topicItem,
            { borderBottomColor: topicBorderColor },
            isActive && styles.topicItemActive,
            pressed && styles.topicItemPressed,
          ]}
          onPress={() => onTopicSelect(item.id)}>
          <ThemedView style={styles.topicItemContent}>
            <ThemedText
              type="defaultSemiBold"
              style={[styles.topicTitle, isActive && styles.topicTitleActive]}>
              {item.title}
            </ThemedText>
            <ThemedText style={styles.topicSummary} numberOfLines={2}>
              {item.summary}
            </ThemedText>
            <ThemedText style={styles.topicTime}>{item.updatedAt}</ThemedText>
          </ThemedView>
          {isActive && (
            <MaterialIcons name="check-circle" size={20} color="#007A8C" />
          )}
        </Pressable>
      );
    }, [chatId, topicBorderColor, onTopicSelect]);

    return (
      <FlatList
        data={filteredTopics}
        renderItem={renderTopicItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.topicsList}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <ThemedView style={styles.emptyTopicsContainer}>
            <MaterialIcons 
              name={searchQuery.trim() ? "search-off" : "chat-bubble-outline"} 
              size={64} 
              color={topicIconColor} 
            />
            <ThemedText style={styles.emptyTopicsText}>
              {searchQuery.trim() ? '没有找到匹配的对话' : '还没有话题记录'}
            </ThemedText>
          </ThemedView>
        }
      />
    );
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 顶部栏 */}
      <ThemedView style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleExit}
            activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={openDrawer}
            activeOpacity={0.7}>
            <MaterialIcons name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <ThemedText type="title" style={styles.headerTitle} numberOfLines={1}>
          {currentChat.title}
        </ThemedText>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleClearMessages}
            activeOpacity={0.7}>
            <MaterialIcons name="delete-sweep" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleDelete}
            activeOpacity={0.7}>
            <MaterialIcons name="delete-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleNewChat}
            activeOpacity={0.7}>
            <MaterialIcons name="add-circle-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </ThemedView>

      {/* 消息列表 */}
      <ThemedView style={styles.contentArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
          <ThemedView style={styles.messagesContainer}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => {
                // 使用requestAnimationFrame避免频繁调用，减少内存压力
                requestAnimationFrame(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                });
              }}
            />
          </ThemedView>

          {/* 输入框 */}
          <SafeAreaView edges={['bottom']} style={{ backgroundColor }}>
            <ThemedView style={[styles.inputContainer, { borderTopColor: borderColor }]}>
              <TouchableOpacity
                style={styles.pasteButton}
                onPress={handlePaste}
                activeOpacity={0.7}>
                <MaterialIcons
                  name="content-paste"
                  size={20}
                  color="#3F99A6"
                />
              </TouchableOpacity>
              <TextInput
                style={[
                  styles.input,
                  { color: textColor },
                ]}
                value={inputText}
                onChangeText={setInputText}
                placeholder="输入消息..."
                placeholderTextColor={useThemeColor({}, 'icon')}
                multiline
                maxLength={500}
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  inputText.trim() === '' && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={inputText.trim() === ''}
                activeOpacity={0.7}>
                <MaterialIcons
                  name="send"
                  size={24}
                  color={inputText.trim() === '' ? '#3F99A6' : '#FFFFFF'}
                />
              </TouchableOpacity>
            </ThemedView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </ThemedView>

      {/* 抽屉式话题列表 */}
      <Modal
        visible={drawerVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeDrawer}>
        <SafeAreaView style={styles.drawerContainer} edges={['top', 'bottom', 'left', 'right']}>
          {/* 遮罩层 */}
          <Animated.View
            style={[
              styles.drawerOverlay,
              {
                opacity: overlayOpacity,
              },
            ]}>
            <Pressable style={styles.drawerOverlayPressable} onPress={closeDrawer} />
          </Animated.View>

          {/* 抽屉内容 */}
          <Animated.View
            style={[
              styles.drawerContent,
              {
                transform: [{ translateX: slideAnim }],
                backgroundColor,
              },
            ]}>
            {/* 顶部白色区域 */}
            <View style={[styles.drawerTopArea, { height: insets.top, backgroundColor }]} />
            <View style={styles.drawerSafeArea}>
              {/* 抽屉头部 */}
              <ThemedView style={[styles.drawerHeader, { borderBottomColor: borderColor }]}>
                <ThemedText type="title" style={styles.drawerHeaderTitle}>
                  历史话题
                </ThemedText>
                <TouchableOpacity
                  style={styles.drawerCloseButton}
                  onPress={closeDrawer}
                  activeOpacity={0.7}>
                  <MaterialIcons name="close" size={24} color={textColor} />
                </TouchableOpacity>
              </ThemedView>

              {/* 搜索框 */}
              <SearchInput
                searchQuery={drawerSearchQuery}
                onSearchQueryChange={setDrawerSearchQuery}
                textColor={textColor}
              />

              {/* 话题列表 */}
              <TopicList 
                chatId={id || ''} 
                onTopicSelect={handleTopicSelect}
                searchQuery={drawerSearchQuery}
                topics={drawerTopics}
              />
            </View>
          </Animated.View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#007A8C',
  },
  contentArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#007A8C',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 8,
  },
  messageContainer: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  botMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    position: 'relative',
  },
  userBubble: {
    backgroundColor: '#007A8C',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  botMessageText: {},
  messageActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
  messageActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageActionText: {
    fontSize: 12,
    color: '#3F99A6',
    marginLeft: 4,
  },
  markdownBody: {
    fontSize: 16,
    lineHeight: 22,
  },
  markdownParagraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  markdownListItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  markdownLink: {
    color: '#3F99A6',
  },
  markdownCodeBlock: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    padding: 8,
    borderRadius: 6,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  markdownInlineCode: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: 4,
    borderRadius: 4,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  pasteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E7F2F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 16,
    borderWidth: 1,
    backgroundColor: '#E7F2F3',
    borderColor: '#3F99A6',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007A8C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E7F2F3',
  },
  drawerContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerOverlayPressable: {
    flex: 1,
  },
  drawerContent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  drawerTopArea: {
    width: '100%',
  },
  drawerSafeArea: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  drawerHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  drawerCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topicsList: {
    paddingVertical: 8,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topicItemActive: {
    backgroundColor: 'rgba(0, 122, 140, 0.1)',
  },
  topicItemPressed: {
    opacity: 0.7,
  },
  topicItemContent: {
    flex: 1,
    marginRight: 12,
  },
  topicTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  topicTitleActive: {
    color: '#007A8C',
  },
  topicSummary: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
    lineHeight: 20,
  },
  topicTime: {
    fontSize: 12,
    opacity: 0.5,
  },
  emptyTopicsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
    paddingHorizontal: 32,
  },
  emptyTopicsText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    opacity: 0.6,
  },
  drawerSearchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  drawerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#E7F2F3',
    borderColor: '#3F99A6',
    height: 36,
  },
  drawerSearchIcon: {
    marginRight: 8,
  },
  drawerSearchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    height: 24,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  drawerClearButton: {
    padding: 4,
    marginLeft: 8,
  },
});

