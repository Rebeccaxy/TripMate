import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  searchPlaces,
  type Place,
} from '@/services/communityService';
import {
  toggleLikePlace as toggleLikePlaceService,
  toggleFavoritePlace as toggleFavoritePlaceService,
  getLikedPlaceIds,
  getFavoritedPlaceIds,
} from '@/services/userEngagementService';

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  
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

  // 加载点赞和收藏状态
  useEffect(() => {
    const loadEngagement = async () => {
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
        console.error('Failed to load like/favorite status:', error);
      }
    };
    loadEngagement();
  }, []);

  // 搜索地点
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchPlaces(query);
      setSearchResults(results);
      
      // 更新点赞和收藏状态
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
      console.error('搜索失败:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const handlePlacePress = (placeId: string) => {
    router.push(`/place/${placeId}` as any);
  };

  const handleToggleFavorite = async (placeId: string, e: any) => {
    e?.stopPropagation();
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
    e?.stopPropagation();
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

  const handleBack = () => {
    router.back();
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

  const renderPlaceCard = ({ item }: { item: Place }) => {
    return (
      <TouchableOpacity
        style={styles.placeCard}
        onPress={() => handlePlacePress(item.id)}
        activeOpacity={0.9}>
        {/* 左侧图片 */}
        <View style={styles.placeCardImageContainer}>
          <Image
            source={getImageSource(item.coverImage)}
            style={styles.placeCardImage}
            contentFit="cover"
          />
        </View>
        
        {/* 右侧内容 */}
        <View style={styles.placeCardContent}>
          <View style={styles.placeCardHeader}>
            <View style={styles.placeCardTitleSection}>
              <Text style={styles.placeCardName} numberOfLines={1} ellipsizeMode="tail">
                {item.name}
              </Text>
              <Text style={styles.placeCardLocation} numberOfLines={1} ellipsizeMode="tail">
                {item.city ? `${item.city}, ${item.country}` : item.country}
              </Text>
            </View>
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
          
          <Text style={styles.placeCardDescription} numberOfLines={2} ellipsizeMode="tail">
            {item.shortDesc}
          </Text>
          
          {/* 标签和统计数据 */}
          <View style={styles.placeCardFooter}>
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
            {/* 统计数据 */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Image
                source={require('@/assets/images/icons/heart-select.png')}
                style={styles.statIcon}
                contentFit="contain"
              />
              <Text style={styles.statText}>{item.stats.likeCount}</Text>
            </View>
            <View style={styles.statItem}>
              <Image
                source={require('@/assets/images/icons/star-select.png')}
                style={styles.statIcon}
                contentFit="contain"
              />
              <Text style={styles.statText}>{item.stats.favoriteCount}</Text>
            </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
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
            onChangeText={setSearchQuery}
            placeholder="Search destinations, cities or tags..."
            placeholderTextColor={iconColor}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}>
              <MaterialIcons name="close" size={20} color={iconColor} />
            </TouchableOpacity>
          )}
        </View>
      </ThemedView>

      {/* 搜索结果列表 */}
      <ThemedView style={styles.contentArea}>
        {isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007A8C" />
            <ThemedText style={styles.loadingText}>Searching...</ThemedText>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            renderItem={renderPlaceCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <ThemedView style={styles.emptyContainer}>
                <MaterialIcons 
                  name={searchQuery.trim() ? 'search-off' : 'search'} 
                  size={64} 
                  color={iconColor} 
                />
                <ThemedText style={styles.emptyText}>
                  {searchQuery.trim() ? '没有找到匹配的目的地' : '搜索旅行目的地'}
                </ThemedText>
                <ThemedText style={styles.emptySubtext}>
                  {searchQuery.trim() 
                    ? '尝试搜索其他城市、国家或标签' 
                    : '输入目的地名称、城市、国家或标签进行搜索'}
                </ThemedText>
              </ThemedView>
            }
          />
        )}
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
  separator: {
    height: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    opacity: 0.6,
  },
  placeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  placeCardImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  placeCardImage: {
    width: '100%',
    height: '100%',
  },
  placeCardContent: {
    flex: 1,
    justifyContent: 'space-between',
    height: 100,
  },
  placeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  placeCardTitleSection: {
    flex: 1,
    marginRight: 8,
  },
  placeCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  placeCardLocation: {
    fontSize: 12,
    color: '#999',
  },
  cardActionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  cardActionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardActionIcon: {
    width: 20,
    height: 20,
  },
  placeCardDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
    flex: 1,
  },
  placeCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  tagBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 10,
    color: '#666',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statIcon: {
    width: 12,
    height: 12,
  },
  statText: {
    fontSize: 11,
    color: '#999',
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

