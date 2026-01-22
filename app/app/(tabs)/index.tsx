import { Image } from 'expo-image';
import { StyleSheet, ImageBackground, ScrollView, View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { getCurrentUser, type User } from '@/services/authService';
import {
  getPopularPlaces,
  getNearestPlaces,
  type Place,
} from '@/services/communityService';
import {
  toggleLikePlace as toggleLikePlaceService,
  toggleFavoritePlace as toggleFavoritePlaceService,
  getLikedPlaceIds,
  getFavoritedPlaceIds,
} from '@/services/userEngagementService';

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayNameOverride, setDisplayNameOverride] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [popularPlaces, setPopularPlaces] = useState<Place[]>([]);
  const [nearestPlaces, setNearestPlaces] = useState<Place[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        const [name, uri] = await Promise.all([
          AsyncStorage.getItem('@tripMate:displayName'),
          AsyncStorage.getItem('@tripMate:avatarUri'),
        ]);
        setDisplayNameOverride(name);
        setAvatarUri(uri);
      } catch (error) {
        console.error('Failed to get user info:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // Sync latest nickname and avatar when returning from Account settings page
  useFocusEffect(
    useCallback(() => {
      const syncFromStorage = async () => {
        try {
          const [name, uri] = await Promise.all([
            AsyncStorage.getItem('@tripMate:displayName'),
            AsyncStorage.getItem('@tripMate:avatarUri'),
          ]);
          setDisplayNameOverride(name);
          setAvatarUri(uri);
        } catch (e) {
          console.error('Failed to refresh home page user info:', e);
        }
      };
      syncFromStorage();
    }, [])
  );

  // Load places data and like/favorite status
  useEffect(() => {
    const loadPlaces = async () => {
      try {
        setLoadingPlaces(true);
        const [popular, nearest, likedIds, favoritedIds] = await Promise.all([
          getPopularPlaces(),
          getNearestPlaces(),
          getLikedPlaceIds(),
          getFavoritedPlaceIds(),
        ]);
        setPopularPlaces(popular);
        setNearestPlaces(nearest);
        
        // Initialize like and favorite status
        const likesMap: Record<string, boolean> = {};
        const favoritesMap: Record<string, boolean> = {};
        likedIds.forEach(id => { likesMap[id] = true; });
        favoritedIds.forEach(id => { favoritesMap[id] = true; });
        setLikes(likesMap);
        setFavorites(favoritesMap);
      } catch (error) {
        console.error('Failed to load places data:', error);
      } finally {
        setLoadingPlaces(false);
      }
    };
    loadPlaces();
  }, []);


  // 从 Account 返回时刷新点赞收藏状态
  useFocusEffect(
    useCallback(() => {
      const syncEngagement = async () => {
        try {
          const [likedIds, favoritedIds] = await Promise.all([
            getLikedPlaceIds(),
            getFavoritedPlaceIds(),
          ]);
          const likesMap: Record<string, boolean> = {};
          const favoritesMap: Record<string, boolean> = {};
          likedIds.forEach(id => { likesMap[id] = true; });
          favoritedIds.forEach(id => { favoritesMap[id] = true; });
          setLikes(likesMap);
          setFavorites(favoritesMap);
        } catch (error) {
          console.error('Failed to sync like/favorite status:', error);
        }
      };
      syncEngagement();
    }, [])
  );

  const displayName = displayNameOverride || user?.name || 'TripMate';
  const initials = (displayName || 'T').trim().charAt(0).toUpperCase();
  const points = 3000;

  const handleToggleFavorite = async (placeId: string, e: any) => {
    e?.stopPropagation(); // 阻止事件冒泡
    try {
      const newState = await toggleFavoritePlaceService(placeId);
      setFavorites(prev => ({
        ...prev,
        [placeId]: newState
      }));
    } catch (error) {
      console.error('Failed to toggle favorite status:', error);
    }
  };

  const handleToggleLike = async (placeId: string, e: any) => {
    e?.stopPropagation(); // 阻止事件冒泡
    try {
      const newState = await toggleLikePlaceService(placeId);
      setLikes(prev => ({
        ...prev,
        [placeId]: newState
      }));
    } catch (error) {
      console.error('Failed to toggle like status:', error);
    }
  };

  const handlePlacePress = (placeId: string) => {
    router.push(`/place/${placeId}` as any);
  };

  const handleSearchPress = () => {
    router.push('/search');
  };

  // 获取图片源（处理字符串路径和 require 返回的 number）
  const getImageSource = (image: string | number) => {
    if (typeof image === 'number') {
      return image;
    }
    // 如果是字符串，尝试映射到本地资源
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

  return (
    <ImageBackground
      source={require('@/assets/images/home/HomeBG.png')}
      style={styles.backgroundImage}
      resizeMode="cover">
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* 顶部用户信息区域 */}
        <View style={styles.headerContainer}>
          {/* 左侧：用户名和积分 */}
          <View style={styles.leftSection}>
            {/* 第一行：Hi, 用户昵称 */}
            <Text style={styles.greetingText}>Hi, {displayName}</Text>
            {/* 第二行：图标 + 积分 */}
            <View style={styles.pointsContainer}>
              <Image
                source={require('@/assets/images/icons/ri_copper-coin-line.png')}
                style={styles.pointsIcon}
                contentFit="contain"
              />
              <Text style={styles.pointsText}>{points} points</Text>
            </View>
          </View>
          {/* 右侧：圆形头像 */}
          <View style={styles.avatarContainer}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarFallbackCircle}>
                <Text style={styles.avatarFallbackText}>{initials}</Text>
              </View>
            )}
          </View>
        </View>

        {/* 搜索框 */}
        <TouchableOpacity 
          style={styles.searchContainer}
          onPress={handleSearchPress}
          activeOpacity={0.8}>
          <Image
            source={require('@/assets/images/icons/search-icon.png')}
            style={styles.searchIcon}
            contentFit="contain"
          />
          <Text style={styles.searchInput}>Where to go?</Text>
        </TouchableOpacity>

        {/* Popular Places 板块 */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Popular Places</Text>
          {loadingPlaces ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007A8C" />
            </View>
          ) : (
            <FlatList
              data={popularPlaces}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.popularCard}
                  onPress={() => handlePlacePress(item.id)}
                  activeOpacity={0.9}>
                  <View style={styles.popularCardImageContainer}>
                    <Image
                      source={getImageSource(item.coverImage)}
                      style={styles.popularCardImage}
                      contentFit="cover"
                    />
                    {/* 右上角按钮 */}
                    <View style={styles.cardActionButtons}>
                      <TouchableOpacity
                        style={styles.cardActionButton}
                        onPress={(e) => handleToggleLike(item.id, e)}
                        activeOpacity={0.7}>
                        <Image
                          source={likes[item.id] 
                            ? require('@/assets/images/icons/heart-select.png')
                            : require('@/assets/images/icons/heart.png')
                          }
                          style={styles.cardActionIcon}
                          contentFit="contain"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cardActionButton}
                        onPress={(e) => handleToggleFavorite(item.id, e)}
                        activeOpacity={0.7}>
                        <Image
                          source={favorites[item.id]
                            ? require('@/assets/images/icons/star-select.png')
                            : require('@/assets/images/icons/star.png')
                          }
                          style={styles.cardActionIcon}
                          contentFit="contain"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.popularCardContent}>
                    <Text style={styles.popularCardName} numberOfLines={1} ellipsizeMode="tail">
                      {item.name}
                    </Text>
                    <Text style={styles.popularCardDescription} numberOfLines={2} ellipsizeMode="tail">
                      {item.shortDesc}
                    </Text>
                    {/* 显示标签 */}
                    {item.tags.length > 0 && (
                      <View style={styles.tagsContainer}>
                        {item.tags.slice(0, 2).map((tag, index) => (
                          <View key={index} style={styles.tagBadge}>
                            <Text style={styles.tagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.popularList}
            />
          )}
        </View>

        {/* Nearest Places 板块 */}
        <View style={[styles.sectionContainer, styles.nearestSectionContainer]}>
          <View style={styles.nearestSectionHeader}>
            <Text style={styles.sectionTitle}>Nearest Places</Text>
            <TouchableOpacity
              style={styles.writePostButton}
              onPress={() => router.push('/post/editor')}
              activeOpacity={0.8}>
              <MaterialIcons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.writePostButtonText}>Post</Text>
            </TouchableOpacity>
          </View>
          {loadingPlaces ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007A8C" />
            </View>
          ) : (
            nearestPlaces.map((place) => (
              <TouchableOpacity 
                key={place.id} 
                style={styles.nearestCard}
                onPress={() => handlePlacePress(place.id)}
                activeOpacity={0.9}>
                {/* 左侧图片 */}
                <Image
                  source={getImageSource(place.coverImage)}
                  style={styles.nearestCardImage}
                  contentFit="cover"
                />
                {/* 右侧内容 */}
                <View style={styles.nearestCardContent}>
                  <Text style={styles.nearestCardName}>{place.name}</Text>
                  <View style={styles.nearestCardLocation}>
                    <Image
                      source={require('@/assets/images/icons/Location.png')}
                      style={styles.locationIcon}
                      contentFit="contain"
                    />
                    <Text style={styles.nearestCardLocationText}>
                      {place.city ? `${place.city}, ${place.country}` : place.country}
                    </Text>
                  </View>
                  {place.geo && (
                    <Text style={styles.nearestCardDistance}>
                      {place.stats.likeCount} likes • {place.stats.favoriteCount} favorites
                    </Text>
                  )}
                </View>
                {/* Route 按钮 */}
                <TouchableOpacity 
                  style={styles.routeButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handlePlacePress(place.id);
                  }}>
                  <Text style={styles.routeButtonText}>Route</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 60,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  leftSection: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  greetingText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 40,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 24,
    marginTop: -4,
  },
  pointsIcon: {
    width: 20,
    height: 20,
  },
  pointsText: {
    fontSize: 16,
    color: '#FFC107',
    fontWeight: '500',
    lineHeight: 20,
  },
  avatarContainer: {
    marginLeft: 16,
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0E0E0',
  },
  avatarFallbackCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007A8C',
  },
  searchContainer: {
    marginTop: 0,  // 增加与头像区域的间距
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
    tintColor: '#999',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#999',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  tagBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    color: '#666',
  },
  sectionContainer: {
    marginBottom: 32,
    backgroundColor: 'transparent',
  },
  nearestSectionContainer: {
    marginTop: -20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  nearestSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  writePostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#007A8C',
  },
  writePostButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  popularList: {
    paddingRight: 20,
    paddingBottom: 8,
  },
  popularCard: {
    width: 160,
    height: 200,
    marginRight: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  popularCardImageContainer: {
    width: '100%',
    height: '55%',
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  popularCardImage: {
    width: '100%',
    height: '100%',
  },
  cardActionButtons: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 0,
  },
  cardActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardActionIcon: {
    width: 28,
    height: 28,
  },
  popularCardContent: {
    paddingLeft: 10,
    paddingTop: 8,
    height: 80,
    justifyContent: 'flex-start',
    flexDirection: 'column',
    position: 'relative',
  },
  popularCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
    lineHeight: 20,
    height: 20,
  },
  popularCardDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    height: 32,
  },
  durationBadge: {
    backgroundColor: '#336749',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 50,
    alignSelf: 'flex-start',
    marginTop: -10,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nearestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nearestCardImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  nearestCardContent: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  nearestCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  nearestCardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationIcon: {
    width: 14,
    height: 14,
    marginRight: 4,
    tintColor: '#999',
  },
  nearestCardLocationText: {
    fontSize: 14,
    color: '#999',
  },
  nearestCardDistance: {
    fontSize: 14,
    color: '#999',
  },
  routeButton: {
    backgroundColor: '#007A8C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  routeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  postsSectionContainer: {
    marginTop: 24,
    paddingBottom: 24,
  },
  postsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  createPostButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007A8C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  postTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  postTabActive: {
    backgroundColor: '#007A8C',
    borderColor: '#007A8C',
  },
  postTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  postTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyPostsContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyPostsText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptyPostsSubtext: {
    fontSize: 14,
    color: '#999',
  },
  postsList: {
    gap: 12,
  },
  postCard: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
