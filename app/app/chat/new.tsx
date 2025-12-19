import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  getAllConversations,
  type ChatConversation,
} from '@/services/chatService';

// 预设问题
const suggestedQuestions = [
  "Plan a trip to Tokyo",
  "Best places to visit in Paris",
  "I want to experience traditional culture in Kyoto. Any recommendations?",
];

interface SuggestedQuestionProps {
  question: string;
  onPress: () => void;
  backgroundColor: string;
  textColor: string;
}

function SuggestedQuestion({ question, onPress, backgroundColor, textColor }: SuggestedQuestionProps) {
  return (
    <TouchableOpacity
      style={[styles.questionCard, { backgroundColor }]}
      onPress={onPress}
      activeOpacity={0.7}>
      <ThemedText style={[styles.questionText, { color: textColor }]}>{question}</ThemedText>
      <MaterialIcons name="arrow-forward" size={20} color={textColor} style={styles.arrowIcon} />
    </TouchableOpacity>
  );
}

interface HistoryListProps {
  conversations: ChatConversation[];
  onSelect: (chatId: string) => void;
  borderColor: string;
  iconColor: string;
  searchQuery?: string;
}

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

function HistoryListComponent({ conversations, onSelect, borderColor, iconColor, searchQuery = '' }: HistoryListProps) {
  const renderHistoryItem = React.useCallback(({ item }: { item: ChatConversation }) => {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.historyItem,
          { borderBottomColor: borderColor },
          pressed && styles.historyItemPressed,
        ]}
        onPress={() => onSelect(item.id)}>
        <ThemedView style={styles.historyItemContent}>
          <ThemedText type="defaultSemiBold" style={styles.historyTitle}>
            {item.title}
          </ThemedText>
          <ThemedText style={styles.historySummary} numberOfLines={2}>
            {item.summary}
          </ThemedText>
          <ThemedText style={styles.historyTime}>{item.updatedAt}</ThemedText>
        </ThemedView>
        <MaterialIcons
          name="chevron-right"
          size={24}
          color={iconColor}
          style={styles.chevronIcon}
        />
      </Pressable>
    );
  }, [borderColor, iconColor, onSelect]);

  return (
    <FlatList
      data={conversations}
      renderItem={renderHistoryItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.historyList}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={false}
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={
        <ThemedView style={styles.emptyHistoryContainer}>
          <MaterialIcons 
            name={searchQuery.trim() ? "search-off" : "chat-bubble-outline"} 
            size={64} 
            color={iconColor} 
          />
          <ThemedText style={styles.emptyHistoryText}>
            {searchQuery.trim() ? '没有找到匹配的对话' : '还没有历史对话'}
          </ThemedText>
        </ThemedView>
      }
    />
  );
}

export default function NewChatScreen() {
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor(
    { light: '#E5E5E5', dark: '#333333' },
    'background'
  );
  const inputBorderColor = useThemeColor(
    { light: '#E5E5E5', dark: '#48484A' },
    'background'
  );
  const cardBackgroundColor = useThemeColor(
    { light: '#F5F5F5', dark: '#2C2C2E' },
    'background'
  );
  const iconColor = useThemeColor({}, 'icon');

  // 加载历史对话
  useEffect(() => {
    const loadConversations = async () => {
      const allConversations = await getAllConversations();
      setConversations(allConversations);
    };
    loadConversations();
  }, []);

  // 使用 useMemo 优化搜索过滤，避免不必要的重新渲染
  const filteredConversations = useMemo(() => {
    if (searchQuery.trim() === '') {
      return conversations;
    }
    return conversations.filter(
      (conv) =>
        conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.summary.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, conversations]);

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
      setSearchQuery(''); // 关闭抽屉时清空搜索
    });
  };

  // 处理历史对话选择
  const handleHistorySelect = (chatId: string) => {
    router.push(`/chat/${chatId}`);
    closeDrawer();
  };

  const handleQuestionPress = (question: string) => {
    // 生成新的聊天 ID
    const newChatId = Date.now().toString();
    // 使用 replace 替换当前页面，这样新聊天界面会被移除
    router.replace({
      pathname: '/chat/[id]',
      params: { id: newChatId, initialMessage: question },
    });
  };

  const handleSend = () => {
    if (inputText.trim() === '') return;
    handleQuestionPress(inputText.trim());
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 顶部栏 */}
      <ThemedView style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleBack}
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
        <ThemedText type="title" style={styles.headerTitle}>
          New Chat
        </ThemedText>
        <View style={styles.headerButton} />
      </ThemedView>

      {/* 内容区域 */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* 欢迎区域 */}
          <ThemedView style={styles.welcomeSection}>
            <ThemedText type="title" style={styles.welcomeTitle}>
              Let's Plan Your Trip! 🌍
            </ThemedText>
            <ThemedText style={styles.welcomeSubtitle}>
              I'm here to help you create the perfect travel itinerary. Choose a question below or
              ask me anything about your travel plans!
            </ThemedText>
          </ThemedView>

          {/* 建议问题 */}
          <ThemedView style={styles.questionsSection}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Suggested Questions
            </ThemedText>
            {suggestedQuestions.map((question, index) => (
              <SuggestedQuestion
                key={index}
                question={question}
                onPress={() => handleQuestionPress(question)}
                backgroundColor={cardBackgroundColor}
                textColor={textColor}
              />
            ))}
          </ThemedView>
        </ScrollView>

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
              placeholder="Ask about your travel plans..."
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

      {/* 历史对话抽屉 */}
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
                  历史对话
                </ThemedText>
                <TouchableOpacity
                  style={styles.drawerCloseButton}
                  onPress={closeDrawer}
                  activeOpacity={0.7}>
                  <MaterialIcons name="close" size={24} color={textColor} />
                </TouchableOpacity>
              </ThemedView>

              {/* 搜索框 */}
              <View style={styles.drawerSearchWrapper}>
                <View style={styles.drawerSearchContainer}>
                  <MaterialIcons name="search" size={20} color="#3F99A6" style={styles.drawerSearchIcon} />
                  <TextInput
                    style={[styles.drawerSearchInput, { color: textColor }]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="搜索对话..."
                    placeholderTextColor="#3F99A6"
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="search"
                    clearButtonMode="never"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearchQuery('')}
                      style={styles.drawerClearButton}>
                      <MaterialIcons name="close" size={18} color="#3F99A6" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* 对话列表 */}
              <HistoryListComponent
                conversations={filteredConversations}
                onSelect={handleHistorySelect}
                borderColor={borderColor}
                iconColor={iconColor}
                searchQuery={searchQuery}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 16,
    flexGrow: 1,
    justifyContent: 'center',
  },
  welcomeSection: {
    marginTop: 60,
    marginBottom: 32,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.7,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  questionsSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  questionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 0,
  },
  questionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 16,
  },
  arrowIcon: {
    marginLeft: 12,
    opacity: 0.6,
  },
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
    paddingVertical: 16,
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
  historyList: {
    paddingVertical: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyItemPressed: {
    opacity: 0.7,
  },
  historyItemContent: {
    flex: 1,
    marginRight: 12,
  },
  historyTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  historySummary: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
    lineHeight: 20,
  },
  historyTime: {
    fontSize: 12,
    opacity: 0.5,
  },
  chevronIcon: {
    opacity: 0.5,
  },
  emptyHistoryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
    paddingHorizontal: 32,
  },
  emptyHistoryText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    opacity: 0.6,
  },
});

