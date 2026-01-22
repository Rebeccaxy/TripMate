import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  getNotesV2,
  deleteNoteV2,
  type Note as NoteV2,
} from '@/services/noteService';
import { getPlaceById } from '@/services/communityService';

export default function NoteListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<NoteV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [placeNames, setPlaceNames] = useState<Record<string, string>>({});
  const swipeableRefs = useRef<Record<string, any>>({});

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: '#E5E5E5', dark: '#333333' }, 'background');

  // 加载笔记列表
  const loadNotes = async () => {
    try {
      setLoading(true);
      const notesList = await getNotesV2();
      
      // 按更新时间降序排列
      notesList.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      
      setNotes(notesList);

      // 加载关联地点的名称
      const placeIds = notesList
        .filter((note) => note.placeId)
        .map((note) => note.placeId!)
        .filter((id, index, self) => self.indexOf(id) === index); // 去重

      const names: Record<string, string> = {};
      await Promise.all(
        placeIds.map(async (placeId) => {
          try {
            const place = await getPlaceById(placeId);
            if (place) {
              names[placeId] = place.name;
            }
          } catch (error) {
            console.error(`加载地点 ${placeId} 失败:`, error);
          }
        })
      );
      setPlaceNames(names);
    } catch (error) {
      console.error('加载笔记列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 页面获得焦点时刷新列表
  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [])
  );

  // 初始加载
  useEffect(() => {
    loadNotes();
  }, []);

  const handleCreateNote = () => {
    router.push('/note/editor');
  };

  const handleEditNote = (noteId: string) => {
    router.push(`/note/editor?id=${noteId}`);
  };

  const handleDeleteNote = async (note: NoteV2) => {
    // 关闭滑动状态
    if (swipeableRefs.current[note.id]) {
      swipeableRefs.current[note.id].close();
    }

    const noteType = note.status === 'draft' ? '草稿' : '笔记';
    Alert.alert(
      `删除${noteType}`,
      `确定要删除"${note.title}"吗？删除后将无法恢复。`,
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNoteV2(note.id);
              // 删除后清理 ref
              delete swipeableRefs.current[note.id];
              loadNotes();
            } catch (error) {
              console.error('删除笔记失败:', error);
              Alert.alert('错误', '删除笔记失败，请稍后重试');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    item: NoteV2
  ) => {
    return (
      <View style={styles.rightAction}>
        <Pressable
          style={styles.deleteButton}
          onPress={() => handleDeleteNote(item)}>
          <MaterialIcons name="delete" size={24} color="#FFFFFF" />
          <Text style={styles.deleteButtonText}>删除</Text>
        </Pressable>
      </View>
    );
  };

  const renderNoteItem = ({ item }: { item: NoteV2 }) => {
    const excerpt = item.sections?.[0]?.text 
      ? (item.sections[0].text.length > 50 
          ? item.sections[0].text.substring(0, 50) + '...' 
          : item.sections[0].text)
      : '暂无内容';

    const noteContent = (
      <Pressable
        style={[styles.noteItem, { borderColor }, item.status === 'draft' && { opacity: 0.8 }]}
        onPress={() => handleEditNote(item.id)}
        onLongPress={() => handleDeleteNote(item)}>
        <View style={styles.noteContent}>
          <View style={styles.noteHeader}>
            <ThemedText type="defaultSemiBold" style={styles.noteTitle}>
              {item.title}
            </ThemedText>
            {item.status === 'draft' && (
              <View style={styles.draftBadge}>
                <Text style={styles.draftBadgeText}>草稿</Text>
              </View>
            )}
          </View>
          {item.placeId && placeNames[item.placeId] && (
            <ThemedText style={styles.placeName}>
              📍 {placeNames[item.placeId]}
            </ThemedText>
          )}
          <ThemedText style={styles.noteExcerpt} numberOfLines={2}>
            {excerpt}
          </ThemedText>
          <ThemedText style={styles.noteTime}>
            {formatDate(item.updatedAt)}
          </ThemedText>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={textColor} style={styles.chevronIcon} />
      </Pressable>
    );

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) {
            swipeableRefs.current[item.id] = ref;
          } else {
            delete swipeableRefs.current[item.id];
          }
        }}
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
        rightThreshold={40}
        overshootRight={false}
        friction={2}>
        {noteContent}
      </Swipeable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={[]}>
      {/* 顶部绿色安全区域 */}
      <View style={[styles.topSafeArea, { height: insets.top }]} />
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>
          我的笔记
        </ThemedText>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleCreateNote}
          activeOpacity={0.7}>
          <MaterialIcons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007A8C" />
          <ThemedText style={styles.loadingText}>加载中...</ThemedText>
        </View>
      ) : notes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="note-add" size={64} color={textColor} style={{ opacity: 0.3 }} />
          <ThemedText style={styles.emptyTitle}>还没有笔记</ThemedText>
          <ThemedText style={styles.emptySubtext}>
            点击右上角的 + 按钮创建你的第一篇笔记
          </ThemedText>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateNote}
            activeOpacity={0.8}>
            <MaterialIcons name="add" size={20} color="#FFFFFF" />
            <ThemedText style={styles.createButtonText}>创建笔记</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notes}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 80 + (insets.bottom || 0) },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSafeArea: {
    width: '100%',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    opacity: 0.6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#007A8C',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  noteContent: {
    flex: 1,
    marginRight: 12,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  placeName: {
    fontSize: 12,
    color: '#007A8C',
    marginBottom: 6,
  },
  noteExcerpt: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
    lineHeight: 20,
  },
  noteTime: {
    fontSize: 12,
    opacity: 0.5,
  },
  chevronIcon: {
    opacity: 0.5,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  draftBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#C8E1E4',
  },
  draftBadgeText: {
    fontSize: 10,
    color: '#007A8C',
    fontWeight: '600',
  },
  rightAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    borderRadius: 12,
    gap: 4,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
