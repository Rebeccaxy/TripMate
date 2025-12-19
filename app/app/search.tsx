import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  getAllConversations,
  type ChatConversation,
} from '@/services/chatService';

export default function SearchScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState<ChatConversation[]>([]);
  const iconColor = useThemeColor({}, 'icon');
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

  // 加载对话列表
  useEffect(() => {
    const loadConversations = async () => {
      const allConversations = await getAllConversations();
      setConversations(allConversations);
      setFilteredConversations(allConversations);
    };
    loadConversations();
  }, []);

  // 搜索对话
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(
        (conv) =>
          conv.title.toLowerCase().includes(query.toLowerCase()) ||
          conv.summary.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  };

  const handleChatPress = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const handleBack = () => {
    router.back();
  };

  const renderChatItem = ({ item }: { item: ChatConversation }) => {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.chatItem,
          { borderBottomColor: borderColor },
          pressed && styles.chatItemPressed,
        ]}
        onPress={() => handleChatPress(item.id)}>
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
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 顶部栏 */}
      <ThemedView style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleBack}
          activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color={iconColor} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: textColor, borderColor: inputBorderColor }]}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="搜索对话..."
            placeholderTextColor={iconColor}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => handleSearch('')}
              style={styles.clearButton}>
              <MaterialIcons name="close" size={20} color={iconColor} />
            </TouchableOpacity>
          )}
        </View>
      </ThemedView>

      {/* 搜索结果列表 */}
      <ThemedView style={styles.contentArea}>
        <FlatList
          data={filteredConversations}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <ThemedView style={styles.emptyContainer}>
              <MaterialIcons name="search-off" size={64} color={iconColor} />
              <ThemedText style={styles.emptyText}>
                {searchQuery.trim() ? '没有找到匹配的对话' : '输入关键词搜索对话'}
              </ThemedText>
              <ThemedText style={styles.emptySubtext}>
                {searchQuery.trim() ? '尝试其他关键词' : '搜索标题或摘要内容'}
              </ThemedText>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#007A8C',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  contentArea: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
});

