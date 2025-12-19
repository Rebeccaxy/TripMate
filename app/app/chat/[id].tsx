import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  formatUpdatedAt,
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
          // 如果有保存的消息，使用保存的消息
          setMessages(savedMessages);
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

  // 处理开始新对话
  const handleNewChat = () => {
    router.push('/chat/new');
  };

  // 处理退出
  const handleExit = () => {
    // 使用 router.back() 来触发转场动画
    // 如果是从新聊天页面来的，新聊天界面已经被replace掉了，所以直接back会回到列表页
    router.back();
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

  // 滚动到底部
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (inputText.trim() === '') return;

    const messageText = inputText.trim();

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');

    // 保存用户消息到存储
    if (id) {
      await addMessageToChat(id, userMessage);
      
      // 更新对话的更新时间
      updateConversation(id, {
        updatedAt: formatUpdatedAt(new Date()),
        summary: messageText.length > 50 
          ? messageText.substring(0, 50) + '...' 
          : messageText,
      });
    }

    // 模拟机器人回复（延迟1秒）
    setTimeout(async () => {
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: '收到您的消息！我正在为您处理，请稍候...',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      
      // 保存机器人消息到存储
      if (id) {
        await addMessageToChat(id, botMessage);
      }
    }, 1000);
  };

  // 如果有初始消息且是新聊天，自动发送机器人回复
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
      setTimeout(async () => {
        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: "Great! I'd be happy to help you plan your trip. Let me gather some information to create the perfect itinerary for you. What dates are you planning to travel?",
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);
        
        // 保存机器人回复到存储
        await addMessageToChat(id, botMessage);
      }, 1000);
    }
  }, [initialMessage, messages, hasAutoReplied, id]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    return (
      <View
        style={[
          styles.messageContainer,
          item.isUser ? styles.userMessageContainer : styles.botMessageContainer,
        ]}>
        <View
          style={[
            styles.messageBubble,
            item.isUser
              ? styles.userBubble
              : [styles.botBubble, { backgroundColor: botBubbleColor }],
          ]}>
          <ThemedText
            style={[
              styles.messageText,
              item.isUser
                ? styles.userMessageText
                : [styles.botMessageText, { color: botTextColor }],
            ]}>
            {item.text}
          </ThemedText>
        </View>
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
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
          </ThemedView>

          {/* 输入框 */}
          <SafeAreaView edges={['bottom']} style={{ backgroundColor }}>
            <ThemedView style={[styles.inputContainer, { borderTopColor: borderColor }]}>
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
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

