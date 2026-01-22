import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image as ExpoImage } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  getPostsByCategory,
  deletePost,
  type Post,
} from '@/services/noteService';
import { getCurrentUser } from '@/services/authService';

type PostCategory = 'sight' | 'food' | 'route';

const CATEGORY_LABELS: Record<PostCategory, string> = {
  sight: 'Sightseeing',
  food: 'Food',
  route: 'Route',
};

export default function CommunityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState<PostCategory>('sight');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: '#E5E5E5', dark: '#333333' }, 'background');

  // 加载用户信息
  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  // 加载帖子
  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const postsList = await getPostsByCategory(activeCategory);
      setPosts(postsList);
    } catch (error) {
      console.error('加载帖子失败:', error);
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  // 页面获得焦点时刷新
  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [loadPosts])
  );

  // Delete post
  const handleDeletePost = async (post: Post) => {
    Alert.alert(
      'Delete Post',
      `Are you sure you want to delete "${post.title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePost(post.id);
              loadPosts(); // Refresh posts list
            } catch (error) {
              console.error('Failed to delete post:', error);
              Alert.alert('Error', 'Failed to delete post, please try again later');
            }
          },
        },
      ],
      { cancelable: true }
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
          Community
        </ThemedText>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.push('/note/editor')}
          activeOpacity={0.7}>
          <MaterialIcons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* 分类标签 */}
      <View style={styles.categoryTabs}>
        {(['sight', 'food', 'route'] as PostCategory[]).map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryTab,
              activeCategory === category && styles.categoryTabActive,
            ]}
            onPress={() => setActiveCategory(category)}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.categoryTabText,
                activeCategory === category && styles.categoryTabTextActive,
              ]}>
              {CATEGORY_LABELS[category]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 帖子列表 */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 80 + (insets.bottom || 0) },
        ]}
        showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007A8C" />
            <ThemedText style={styles.loadingText}>Loading...</ThemedText>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="article" size={64} color={textColor} style={{ opacity: 0.3 }} />
            <ThemedText style={styles.emptyTitle}>
              No {CATEGORY_LABELS[activeCategory]} shares yet
            </ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Publish your first note!
            </ThemedText>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/note/editor')}
              activeOpacity={0.8}>
              <MaterialIcons name="add" size={20} color="#FFFFFF" />
              <ThemedText style={styles.createButtonText}>Publish Note</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.postsList}>
            {posts.map((post) => {
              const isMyPost = post.userId === user?.id;
              return (
                <View key={post.id} style={[styles.postCard, { borderColor }]}>
                  <TouchableOpacity
                    style={styles.postCardContent}
                    onPress={() => {
                      // 点击帖子可以查看详情（未来可以创建详情页）
                      if (post.placeId) {
                        router.push(`/place/${post.placeId}`);
                      }
                    }}
                    activeOpacity={0.7}>
                    {/* 帖子头部 */}
                    <View style={styles.postHeader}>
                      <View style={styles.postHeaderLeft}>
                        <Text style={styles.postTitle} numberOfLines={1}>
                          {post.title}
                        </Text>
                        <View style={styles.postCategoryBadge}>
                          <Text style={styles.postCategoryText}>
                            {CATEGORY_LABELS[post.category]}
                          </Text>
                        </View>
                      </View>
                      {isMyPost && (
                        <TouchableOpacity
                          style={styles.postDeleteButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDeletePost(post);
                          }}
                          activeOpacity={0.7}>
                          <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* 帖子内容预览 */}
                    <Text style={styles.postText} numberOfLines={3}>
                      {post.text}
                    </Text>

                    {/* 帖子图片预览 */}
                    {post.images && post.images.length > 0 && (
                      <View style={styles.postImagesContainer}>
                        {post.images.slice(0, 3).map((imageUri, index) => (
                          <ExpoImage
                            key={index}
                            source={{ uri: imageUri }}
                            style={styles.postImage}
                            contentFit="cover"
                          />
                        ))}
                        {post.images.length > 3 && (
                          <View style={styles.postImageMore}>
                            <Text style={styles.postImageMoreText}>+{post.images.length - 3}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* 帖子统计 */}
                    <View style={styles.postStats}>
                      <View style={styles.postStatItem}>
                        <MaterialIcons name="favorite-outline" size={14} color="#666" />
                        <Text style={styles.postStatText}>{post.likeCount}</Text>
                      </View>
                      <View style={styles.postStatItem}>
                        <MaterialIcons name="star-outline" size={14} color="#666" />
                        <Text style={styles.postStatText}>{post.favoriteCount}</Text>
                      </View>
                      <View style={styles.postStatItem}>
                        <MaterialIcons name="comment-outline" size={14} color="#666" />
                        <Text style={styles.postStatText}>{post.commentCount}</Text>
                      </View>
                      <Text style={styles.postTime}>
                        {new Date(post.createdAt).toLocaleDateString('en-US')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
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
  categoryTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  categoryTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  categoryTabActive: {
    backgroundColor: '#007A8C',
    borderColor: '#007A8C',
  },
  categoryTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
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
    paddingTop: 100,
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
  postsList: {
    gap: 12,
  },
  postCard: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 1,
  },
  postCardContent: {
    padding: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  postHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  postTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  postCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E0F2F1',
  },
  postCategoryText: {
    fontSize: 10,
    color: '#007A8C',
    fontWeight: '600',
  },
  postDeleteButton: {
    padding: 4,
  },
  postText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  postImagesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  postImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  postImageMore: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postImageMoreText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  postStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postStatText: {
    fontSize: 12,
    color: '#666',
  },
  postTime: {
    marginLeft: 'auto',
    fontSize: 12,
    color: '#999',
  },
});
