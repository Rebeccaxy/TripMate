import { Image } from 'expo-image';
import { StyleSheet, ImageBackground, ScrollView, View, Text, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';

import { getCurrentUser, type User } from '@/services/authService';

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [likes, setLikes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('获取用户信息失败:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const displayName = user?.name || 'TripMate';
  const points = 3000;

  // Popular Places 数据
  const popularPlaces = [
    { 
      id: '1', 
      name: 'Mount Bromo', 
      description: 'Volcano in East Java',
      duration: '3D2N',
      image: require('@/assets/images/popular-places/PP1.png') 
    },
    { 
      id: '2', 
      name: 'Labengki Sombori', 
      description: 'Islands in Sulawesi',
      duration: '3D2N',
      image: require('@/assets/images/popular-places/PP2.png') 
    },
    { 
      id: '3', 
      name: 'Place Name', 
      description: 'Place Description',
      duration: '3D2N',
      image: require('@/assets/images/popular-places/PP3.png') 
    },
  ];

  const toggleFavorite = (placeId: string) => {
    setFavorites(prev => ({
      ...prev,
      [placeId]: !prev[placeId]
    }));
  };

  const toggleLike = (placeId: string) => {
    setLikes(prev => ({
      ...prev,
      [placeId]: !prev[placeId]
    }));
  };

  const nearestPlaces = [
    { 
      id: '1', 
      name: 'Bajra Sandhi Monument', 
      location: 'Panjer, South Denpasar',
      distance: '3.3 Km',
      image: require('@/assets/images/nearest-places/NP1.png')
    },
    { 
      id: '2', 
      name: 'Sanur Beach', 
      location: 'Sanur, South Denpasar',
      distance: '10.4 km',
      image: require('@/assets/images/nearest-places/NP2.png')
    },
    { 
      id: '3', 
      name: 'Mertasari Beach', 
      location: 'Sanur, South Denpasar',
      distance: '3.3 km',
      image: require('@/assets/images/nearest-places/NP3.png')
    },
  ];

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
            <Image
              source={require('@/assets/images/avatars/default-avatar.png')}
              style={styles.avatar}
              contentFit="cover"
            />
          </View>
        </View>

        {/* 搜索框 */}
        <View style={styles.searchContainer}>
          <Image
            source={require('@/assets/images/icons/search-icon.png')}
            style={styles.searchIcon}
            contentFit="contain"
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Where to go?"
            placeholderTextColor="#999"
            editable={false}
          />
        </View>

        {/* Popular Places 板块 */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Popular Places</Text>
          <FlatList
            data={popularPlaces}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.popularCard}>
                <View style={styles.popularCardImageContainer}>
                  <Image
                    source={item.image}
                    style={styles.popularCardImage}
                    contentFit="cover"
                  />
                  {/* 右上角按钮 */}
                  <View style={styles.cardActionButtons}>
                    <TouchableOpacity
                      style={styles.cardActionButton}
                      onPress={() => toggleLike(item.id)}
                      activeOpacity={0.7}>
                      <Image
                        source={likes[item.id] 
                          ? require('@/assets/images/icons/star-select.png')
                          : require('@/assets/images/icons/star.png')
                        }
                        style={styles.cardActionIcon}
                        contentFit="contain"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cardActionButton}
                      onPress={() => toggleFavorite(item.id)}
                      activeOpacity={0.7}>
                      <Image
                        source={favorites[item.id]
                          ? require('@/assets/images/icons/heart-select.png')
                          : require('@/assets/images/icons/heart.png')
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
                    {item.description}
                  </Text>
                  {/* 右下角行程标注 */}
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{item.duration}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.popularList}
          />
        </View>

        {/* Nearest Places 板块 */}
        <View style={[styles.sectionContainer, styles.nearestSectionContainer]}>
          <Text style={styles.sectionTitle}>Nearest Places</Text>
          {nearestPlaces.map((place) => (
            <TouchableOpacity key={place.id} style={styles.nearestCard}>
              {/* 左侧图片 */}
              <Image
                source={place.image}
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
                  <Text style={styles.nearestCardLocationText}>{place.location}</Text>
                </View>
                <Text style={styles.nearestCardDistance}>{place.distance}</Text>
              </View>
              {/* Route 按钮 */}
              <TouchableOpacity style={styles.routeButton}>
                <Text style={styles.routeButtonText}>Route</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
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
    color: '#000',
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
    backgroundColor: '#336749',
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
});
