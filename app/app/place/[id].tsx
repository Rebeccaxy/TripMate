import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image as ExpoImage } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  getPlaceById,
  getSightsByPlace,
  getFoodsByPlace,
  getRoutesByPlace,
  getCommentsByPlace,
  postComment,
  type Place,
  type SightItem,
  type FoodItem,
  type RouteItem,
  type CommentItem,
} from '@/services/communityService';
import {
  toggleLikePlace as toggleLikePlaceService,
  toggleFavoritePlace as toggleFavoritePlaceService,
  isPlaceLiked,
  isPlaceFavorited,
} from '@/services/userEngagementService';
import AsyncStorage from '@react-native-async-storage/async-storage';

type TabType = 'sight' | 'food' | 'route';

export default function PlaceDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [place, setPlace] = useState<Place | null>(null);
  const [sights, setSights] = useState<SightItem[]>([]);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('sight');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: '#E5E5E5', dark: '#333333' }, 'background');

  // 加载数据
  const loadData = async (silent = false) => {
    if (!id) return;
    
    try {
      if (!silent) setLoading(true);
      
      const [placeData, sightsData, foodsData, routesData, commentsData, liked, favorited] = await Promise.all([
        getPlaceById(id),
        getSightsByPlace(id),
        getFoodsByPlace(id),
        getRoutesByPlace(id),
        getCommentsByPlace(id),
        isPlaceLiked(id),
        isPlaceFavorited(id),
      ]);

      if (placeData) {
        setPlace(placeData);
        setIsLiked(liked);
        setIsFavorited(favorited);
      }
      setSights(sightsData);
      setFoods(foodsData);
      setRoutes(routesData);
      setComments(commentsData);
    } catch (error) {
      console.error('加载地点详情失败:', error);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleToggleLike = async () => {
    if (!id) return;
    try {
      const newState = await toggleLikePlaceService(id);
      setIsLiked(newState);
    } catch (error) {
      console.error('切换点赞状态失败:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (!id) return;
    try {
      const newState = await toggleFavoritePlaceService(id);
      setIsFavorited(newState);
    } catch (error) {
      console.error('切换收藏状态失败:', error);
    }
  };

  const handleSubmitComment = async () => {
    if (!id || !commentText.trim() || submittingComment) return;
    
    try {
      setSubmittingComment(true);
      const newComment = await postComment(id, commentText.trim());
      setComments([newComment, ...comments]);
      setCommentText('');
      if (place) {
        setPlace({
          ...place,
          stats: {
            ...place.stats,
            commentCount: place.stats.commentCount + 1,
          },
        });
      }
    } catch (error) {
      console.error('发布评论失败:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleChatWithAI = async (item: SightItem | FoodItem | RouteItem, type: 'sight' | 'food' | 'route') => {
    if (!place) return;
    
    try {
      // 获取用户的 Travel DNA（从 AsyncStorage 读取）
      let travelDNA: any = null;
      try {
        const dnaJson = await AsyncStorage.getItem('@tripMate:travelDNA:v2');
        if (dnaJson) {
          travelDNA = JSON.parse(dnaJson);
        }
      } catch (e) {
        console.warn('获取 Travel DNA 失败:', e);
      }
      
      // 构建上下文
      const context = {
        place: {
          id: place.id,
          name: place.name,
          country: place.country,
          city: place.city,
        },
        item: {
          type,
          ...item,
        },
        travelDNA,
      };

      const chatId = Date.now().toString();
      let initialMessage = '';

      if (type === 'sight') {
        initialMessage = `我想了解 ${place.name} 的 ${(item as SightItem).title}，请为我详细介绍这个景点，包括最佳游览时间、门票信息和游玩建议。`;
      } else if (type === 'food') {
        initialMessage = `我想在 ${place.name} 品尝 ${(item as FoodItem).name}，请为我介绍这道美食的特色、推荐餐厅和价格水平。`;
      } else if (type === 'route') {
        initialMessage = `我想按照这个路线游览 ${place.name}：${(item as RouteItem).title}，请为我详细规划每天的行程安排。`;
      }

      router.push({
        pathname: '/chat/[id]',
        params: {
          id: chatId,
          initialMessage,
          context: JSON.stringify(context),
        },
      });
    } catch (error) {
      console.error('跳转到聊天页面失败:', error);
    }
  };

  // 获取图片源
  const getImageSource = (image: string | number) => {
    if (typeof image === 'number') {
      return image;
    }
    const imageMap: Record<string, any> = {
      'PP1.png': require('@/assets/images/popular-places/PP1.png'),
      'PP2.png': require('@/assets/images/popular-places/PP2.png'),
      'PP3.png': require('@/assets/images/popular-places/PP3.png'),
      'NP1.png': require('@/assets/images/nearest-places/NP1.png'),
      'NP2.png': require('@/assets/images/nearest-places/NP2.png'),
      'NP3.png': require('@/assets/images/nearest-places/NP3.png'),
    };
    return imageMap[image] || require('@/assets/images/popular-places/PP1.png');
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007A8C" />
          <ThemedText style={styles.loadingText}>加载中...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!place) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <ThemedText>地点不存在</ThemedText>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ThemedText>返回</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

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
        <ThemedText type="title" style={styles.headerTitle} numberOfLines={1}>
          {place.name}
        </ThemedText>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleToggleLike}
            activeOpacity={0.7}>
            <ExpoImage
              source={isLiked 
                ? require('@/assets/images/icons/heart-select.png')
                : require('@/assets/images/icons/heart.png')
              }
              style={styles.headerIcon}
              contentFit="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleToggleFavorite}
            activeOpacity={0.7}>
            <ExpoImage
              source={isFavorited
                ? require('@/assets/images/icons/star-select.png')
                : require('@/assets/images/icons/star.png')
              }
              style={styles.headerIcon}
              contentFit="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* 封面图片 */}
        <View style={styles.coverContainer}>
          <ExpoImage
            source={getImageSource(place.coverImage)}
            style={styles.coverImage}
            contentFit="cover"
          />
          <View style={styles.coverOverlay}>
            <View style={styles.placeInfo}>
              <ThemedText type="title" style={styles.placeName}>
                {place.name}
              </ThemedText>
              <ThemedText style={styles.placeLocation}>
                {place.city ? `${place.city}, ${place.country}` : place.country}
              </ThemedText>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <ExpoImage
                    source={require('@/assets/images/icons/heart-select.png')}
                    style={styles.statIcon}
                    contentFit="contain"
                  />
                  <Text style={styles.statText}>{place.stats.likeCount}</Text>
                </View>
                <View style={styles.statItem}>
                  <ExpoImage
                    source={require('@/assets/images/icons/star-select.png')}
                    style={styles.statIcon}
                    contentFit="contain"
                  />
                  <Text style={styles.statText}>{place.stats.favoriteCount}</Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialIcons name="comment" size={16} color="#FFFFFF" />
                  <Text style={styles.statText}>{place.stats.commentCount}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 简介 */}
        <View style={styles.section}>
          <ThemedText style={styles.description}>{place.shortDesc}</ThemedText>
          {place.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {place.tags.map((tag, index) => (
                <View key={index} style={[styles.tagBadge, { borderColor }]}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Tab 切换 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'sight' && styles.tabActive]}
            onPress={() => setActiveTab('sight')}>
            <ThemedText style={[styles.tabText, activeTab === 'sight' && styles.tabTextActive]}>
              景点
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'food' && styles.tabActive]}
            onPress={() => setActiveTab('food')}>
            <ThemedText style={[styles.tabText, activeTab === 'food' && styles.tabTextActive]}>
              美食
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'route' && styles.tabActive]}
            onPress={() => setActiveTab('route')}>
            <ThemedText style={[styles.tabText, activeTab === 'route' && styles.tabTextActive]}>
              路线
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Tab 内容 */}
        <View style={styles.tabContent}>
          {activeTab === 'sight' && (
            <View>
              {sights.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <ThemedText style={styles.emptyText}>暂无景点信息</ThemedText>
                </View>
              ) : (
                sights.map((sight) => (
                  <View key={sight.id} style={[styles.itemCard, { borderColor }]}>
                    {sight.images.length > 0 && (
                      <ExpoImage
                        source={getImageSource(sight.images[0])}
                        style={styles.itemImage}
                        contentFit="cover"
                      />
                    )}
                    <View style={styles.itemContent}>
                      <ThemedText type="defaultSemiBold" style={styles.itemTitle}>
                        {sight.title}
                      </ThemedText>
                      <ThemedText style={styles.itemDescription}>{sight.description}</ThemedText>
                      <View style={styles.itemMeta}>
                        {sight.recommendedTime && (
                          <View style={styles.metaItem}>
                            <MaterialIcons name="schedule" size={14} color="#666" />
                            <Text style={styles.metaText}>{sight.recommendedTime}</Text>
                          </View>
                        )}
                        {sight.ticketInfo && (
                          <View style={styles.metaItem}>
                            <MaterialIcons name="local-offer" size={14} color="#666" />
                            <Text style={styles.metaText}>{sight.ticketInfo}</Text>
                          </View>
                        )}
                      </View>
                      {sight.tags.length > 0 && (
                        <View style={styles.tagsContainer}>
                          {sight.tags.map((tag, index) => (
                            <View key={index} style={[styles.tagBadge, { borderColor }]}>
                              <Text style={styles.tagText}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.chatButton}
                        onPress={() => handleChatWithAI(sight, 'sight')}>
                        <MaterialIcons name="chat-bubble-outline" size={16} color="#007A8C" />
                        <Text style={styles.chatButtonText}>询问 AI</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'food' && (
            <View>
              {foods.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <ThemedText style={styles.emptyText}>暂无美食信息</ThemedText>
                </View>
              ) : (
                foods.map((food) => (
                  <View key={food.id} style={[styles.itemCard, { borderColor }]}>
                    {food.images.length > 0 && (
                      <ExpoImage
                        source={getImageSource(food.images[0])}
                        style={styles.itemImage}
                        contentFit="cover"
                      />
                    )}
                    <View style={styles.itemContent}>
                      <ThemedText type="defaultSemiBold" style={styles.itemTitle}>
                        {food.name}
                      </ThemedText>
                      <ThemedText style={styles.itemDescription}>{food.description}</ThemedText>
                      <View style={styles.itemMeta}>
                        {food.location && (
                          <View style={styles.metaItem}>
                            <MaterialIcons name="place" size={14} color="#666" />
                            <Text style={styles.metaText}>{food.location}</Text>
                          </View>
                        )}
                        {food.priceLevel && (
                          <Text style={styles.priceLevel}>{food.priceLevel}</Text>
                        )}
                      </View>
                      {food.tags.length > 0 && (
                        <View style={styles.tagsContainer}>
                          {food.tags.map((tag, index) => (
                            <View key={index} style={[styles.tagBadge, { borderColor }]}>
                              <Text style={styles.tagText}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.chatButton}
                        onPress={() => handleChatWithAI(food, 'food')}>
                        <MaterialIcons name="chat-bubble-outline" size={16} color="#007A8C" />
                        <Text style={styles.chatButtonText}>询问 AI</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'route' && (
            <View>
              {routes.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <ThemedText style={styles.emptyText}>暂无路线信息</ThemedText>
                </View>
              ) : (
                routes.map((route) => (
                  <View key={route.id} style={[styles.itemCard, { borderColor }]}>
                    <View style={styles.itemContent}>
                      <ThemedText type="defaultSemiBold" style={styles.itemTitle}>
                        {route.title}
                      </ThemedText>
                      <View style={styles.routeDays}>
                        <MaterialIcons name="calendar-today" size={16} color="#007A8C" />
                        <Text style={styles.routeDaysText}>{route.days} 天行程</Text>
                      </View>
                      <View style={styles.routeSteps}>
                        {route.steps.map((step, index) => (
                          <View key={index} style={styles.routeStep}>
                            <View style={styles.stepNumber}>
                              <Text style={styles.stepNumberText}>{index + 1}</Text>
                            </View>
                            <Text style={styles.stepText}>{step}</Text>
                          </View>
                        ))}
                      </View>
                      {route.tips && (
                        <View style={styles.tipsContainer}>
                          <MaterialIcons name="lightbulb-outline" size={16} color="#FFC107" />
                          <Text style={styles.tipsText}>{route.tips}</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.chatButton}
                        onPress={() => handleChatWithAI(route, 'route')}>
                        <MaterialIcons name="chat-bubble-outline" size={16} color="#007A8C" />
                        <Text style={styles.chatButtonText}>询问 AI</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        {/* 评论区 */}
        <View style={styles.commentsSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            评论 ({comments.length})
          </ThemedText>

          {/* 评论列表 */}
          {comments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>暂无评论，快来发表第一条吧！</ThemedText>
            </View>
          ) : (
            comments.map((comment) => (
              <View key={comment.id} style={[styles.commentCard, { borderColor }]}>
                <View style={styles.commentHeader}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>
                      {comment.userName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.commentInfo}>
                    <Text style={styles.commentUserName}>{comment.userName}</Text>
                    <Text style={styles.commentTime}>
                      {new Date(comment.createdAt).toLocaleDateString('zh-CN')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.commentContent}>{comment.content}</Text>
              </View>
            ))
          )}

          {/* 写笔记和写帖子按钮 */}
          <View style={styles.writeButtonsContainer}>
            <TouchableOpacity
              style={[styles.writeNoteButton, { borderColor }]}
              onPress={() => {
                router.push(
                  `/note/editor?placeId=${id}&placeName=${encodeURIComponent(place?.name || '')}`
                );
              }}
              activeOpacity={0.8}>
              <MaterialIcons name="note-add" size={20} color="#007A8C" />
              <Text style={styles.writeNoteButtonText}>写笔记</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.writePostButton, { borderColor }]}
              onPress={() => {
                // 根据当前激活的 tab 确定默认类别
                const defaultCategory = activeTab === 'sight' ? 'sight' : activeTab === 'food' ? 'food' : 'route';
                router.push(
                  `/post/editor?placeId=${id}&placeName=${encodeURIComponent(place?.name || '')}&category=${defaultCategory}`
                );
              }}
              activeOpacity={0.8}>
              <MaterialIcons name="article" size={20} color="#007A8C" />
              <Text style={styles.writePostButtonText}>写帖子</Text>
            </TouchableOpacity>
          </View>

          {/* 评论输入框 */}
          <View style={[styles.commentInputContainer, { borderColor }]}>
            <TextInput
              style={[styles.commentInput, { color: textColor }]}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="写下你的评论..."
              placeholderTextColor="#999"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!commentText.trim() || submittingComment) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmitComment}
              disabled={!commentText.trim() || submittingComment}>
              {submittingComment ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialIcons name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#007A8C',
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#007A8C',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  coverContainer: {
    height: 300,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    padding: 20,
  },
  placeInfo: {
    gap: 8,
  },
  placeName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeLocation: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    width: 16,
    height: 16,
  },
  statText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  section: {
    padding: 20,
    gap: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  tagText: {
    fontSize: 12,
    color: '#666',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#007A8C',
  },
  tabText: {
    fontSize: 16,
    color: '#999',
  },
  tabTextActive: {
    color: '#007A8C',
    fontWeight: '600',
  },
  tabContent: {
    padding: 20,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
  itemCard: {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  itemImage: {
    width: '100%',
    height: 200,
  },
  itemContent: {
    padding: 16,
    gap: 8,
  },
  itemTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  priceLevel: {
    fontSize: 14,
    color: '#007A8C',
    fontWeight: '600',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E6F7F9',
    marginTop: 8,
  },
  chatButtonText: {
    fontSize: 12,
    color: '#007A8C',
    fontWeight: '600',
  },
  routeDays: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  routeDaysText: {
    fontSize: 14,
    color: '#007A8C',
    fontWeight: '600',
  },
  routeSteps: {
    gap: 12,
    marginBottom: 12,
  },
  routeStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007A8C',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    marginTop: 8,
  },
  tipsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#856404',
  },
  commentsSection: {
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  commentCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007A8C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  commentInfo: {
    flex: 1,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    minHeight: 40,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007A8C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.5,
  },
  writeButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  writeNoteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  writeNoteButtonText: {
    fontSize: 16,
    color: '#007A8C',
    fontWeight: '600',
  },
  writePostButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  writePostButtonText: {
    fontSize: 16,
    color: '#007A8C',
    fontWeight: '600',
  },
});
