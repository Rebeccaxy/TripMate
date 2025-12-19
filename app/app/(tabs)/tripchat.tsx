import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, FlatList, Pressable, Alert, View, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  getAllConversations,
  deleteConversation,
  type ChatConversation,
} from '@/services/chatService';

export default function TripChatScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const iconColor = useThemeColor({}, 'icon');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor(
    { light: '#E5E5E5', dark: '#333333' },
    'background'
  );

  // 加载对话列表
  const loadConversations = async () => {
    const allConversations = await getAllConversations();
    setConversations(allConversations);
  };

  // 打开搜索
  const handleSearch = () => {
    router.push('/search');
  };

  // 页面获得焦点时刷新列表
  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [])
  );

  // 初始加载
  useEffect(() => {
    loadConversations();
  }, []);


  const handleNewChat = () => {
    router.push('/chat/new');
  };

  const handleChatPress = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const handleDeleteChat = (chatId: string, chatTitle: string) => {
    Alert.alert(
      '删除对话',
      `确定要删除"${chatTitle}"吗？删除后将无法恢复。`,
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            await deleteConversation(chatId);
            loadConversations(); // 刷新列表
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    item: ChatConversation
  ) => {
    return (
      <View style={styles.rightAction}>
        <Pressable
          style={styles.deleteButton}
          onPress={() => handleDeleteChat(item.id, item.title)}>
          <MaterialIcons name="delete" size={24} color="#FFFFFF" />
          <ThemedText style={styles.deleteButtonText}>删除</ThemedText>
        </Pressable>
      </View>
    );
  };

  const renderChatItem = ({ item }: { item: ChatConversation }) => {
    return (
      <Swipeable
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
        rightThreshold={40}
        overshootRight={false}>
          <Pressable
            style={({ pressed }) => [
              styles.chatItem,
              { backgroundColor },
              pressed && styles.chatItemPressed,
            ]}
            onPress={() => handleChatPress(item.id)}
            onLongPress={() => handleDeleteChat(item.id, item.title)}>
          <ThemedView style={styles.chatItemContent}>
            <ThemedText type="defaultSemiBold" style={styles.chatTitle}>
              {item.title}
            </ThemedText>
            <ThemedText style={styles.chatSummary} numberOfLines={2}>
              {item.summary}
            </ThemedText>
            <ThemedText style={styles.chatTime}>{item.updatedAt}</ThemedText>
          </ThemedView>
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={iconColor}
            style={styles.chevronIcon}
          />
        </Pressable>
      </Swipeable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 顶部栏 */}
      <ThemedView style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleSearch}
          activeOpacity={0.7}>
          <MaterialIcons name="search" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>
          TripChat
        </ThemedText>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleNewChat}
          activeOpacity={0.7}>
          <MaterialIcons name="add-circle-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </ThemedView>

      {/* 聊天列表 */}
      <ThemedView style={styles.contentArea}>
        <FlatList
          data={conversations}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <ThemedView style={styles.emptyContainer}>
              <MaterialIcons name="chat-bubble-outline" size={64} color={iconColor} />
              <ThemedText style={styles.emptyText}>还没有聊天记录</ThemedText>
              <ThemedText style={styles.emptySubtext}>点击右上角开始新对话</ThemedText>
            </ThemedView>
          }
        />
      </ThemedView>
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
  listContent: {
    paddingVertical: 8,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  separator: {
    height: 8,
  },
  chatItemPressed: {
    opacity: 0.7,
  },
  chatItemContent: {
    flex: 1,
    marginRight: 12,
  },
  chatTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  chatSummary: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
    lineHeight: 20,
  },
  chatTime: {
    fontSize: 12,
    opacity: 0.5,
  },
  chevronIcon: {
    opacity: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
  rightAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007A8C',
  },
  deleteButton: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
});
