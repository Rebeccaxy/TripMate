/**
 * Community 社区服务
 * 提供地点、景点、美食、路线、评论等社区功能
 */

// ==================== 数据模型 ====================

export interface Place {
  id: string;
  name: string;
  country: string;
  city?: string;
  coverImage: string; // 图片路径（字符串）
  shortDesc: string;
  tags: string[];
  geo?: {
    lat: number;
    lng: number;
  };
  stats: {
    likeCount: number;
    favoriteCount: number;
    commentCount: number;
  };
}

export interface SightItem {
  id: string;
  placeId: string;
  title: string;
  images: string[]; // 图片路径（字符串数组）
  description: string;
  tags: string[];
  recommendedTime: string;
  ticketInfo?: string;
  bestTime?: string;
}

export interface FoodItem {
  id: string;
  placeId: string;
  name: string;
  images: string[]; // 图片路径（字符串数组）
  description: string;
  location?: string;
  priceLevel?: string;
  tags: string[];
}

export interface RouteItem {
  id: string;
  placeId: string;
  title: string;
  days: number;
  steps: string[];
  tips?: string;
}

export interface CommentItem {
  id: string;
  placeId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
}

export interface UserEngagement {
  userId: string;
  likedPlaceIds: string[];
  favoritePlaceIds: string[];
}

// ==================== Mock 数据 ====================

// 图片资源映射
const imageResources: Record<string, any> = {
  'PP1.png': require('@/assets/images/popular-places/PP1.png'),
  'PP2.png': require('@/assets/images/popular-places/PP2.png'),
  'PP3.png': require('@/assets/images/popular-places/PP3.png'),
  'NP1.png': require('@/assets/images/nearest-places/NP1.png'),
  'NP2.png': require('@/assets/images/nearest-places/NP2.png'),
  'NP3.png': require('@/assets/images/nearest-places/NP3.png'),
};

// Mock 地点数据
const mockPlaces: Place[] = [
  {
    id: '1',
    name: 'Bali',
    country: 'Indonesia',
    city: 'Bali',
    coverImage: 'PP1.png',
    shortDesc: 'Tropical paradise with stunning beaches, ancient temples, and vibrant culture',
    tags: ['Beach', 'Temple', 'Culture'],
    geo: { lat: -8.3405, lng: 115.092 },
    stats: {
      likeCount: 1250,
      favoriteCount: 890,
      commentCount: 234,
    },
  },
  {
    id: '2',
    name: 'Tokyo',
    country: 'Japan',
    city: 'Tokyo',
    coverImage: 'PP2.png',
    shortDesc: 'Modern metropolis blending traditional culture with cutting-edge technology',
    tags: ['City', 'Culture', 'Food'],
    geo: { lat: 35.6762, lng: 139.6503 },
    stats: {
      likeCount: 2100,
      favoriteCount: 1560,
      commentCount: 456,
    },
  },
  {
    id: '3',
    name: 'Paris',
    country: 'France',
    city: 'Paris',
    coverImage: 'PP3.png',
    shortDesc: 'City of Light with world-famous landmarks, art, and cuisine',
    tags: ['City', 'Art', 'Food', 'Romance'],
    geo: { lat: 48.8566, lng: 2.3522 },
    stats: {
      likeCount: 1890,
      favoriteCount: 1340,
      commentCount: 389,
    },
  },
  {
    id: '4',
    name: 'Santorini',
    country: 'Greece',
    city: 'Santorini',
    coverImage: 'PP1.png',
    shortDesc: 'Stunning island with white-washed buildings and breathtaking sunsets',
    tags: ['Beach', 'Sunset', 'Island'],
    geo: { lat: 36.3932, lng: 25.4615 },
    stats: {
      likeCount: 980,
      favoriteCount: 720,
      commentCount: 178,
    },
  },
  {
    id: '5',
    name: 'Kyoto',
    country: 'Japan',
    city: 'Kyoto',
    coverImage: 'PP2.png',
    shortDesc: 'Ancient capital with thousands of temples and traditional gardens',
    tags: ['Temple', 'Culture', 'History'],
    geo: { lat: 35.0116, lng: 135.7681 },
    stats: {
      likeCount: 1450,
      favoriteCount: 1020,
      commentCount: 267,
    },
  },
];

// Mock 景点数据
const mockSights: Record<string, SightItem[]> = {
  '1': [
    {
      id: 's1',
      placeId: '1',
      title: 'Tanah Lot Temple',
      images: ['PP1.png'],
      description: 'Iconic sea temple perched on a rock formation, best visited at sunset',
      tags: ['Sunset', 'Temple', 'Ocean'],
      recommendedTime: '2-3 hours',
      ticketInfo: 'IDR 60,000',
      bestTime: 'Sunset (6-7 PM)',
    },
    {
      id: 's2',
      placeId: '1',
      title: 'Ubud Rice Terraces',
      images: ['PP2.png'],
      description: 'Stunning terraced rice fields offering peaceful walks and photo opportunities',
      tags: ['Nature', 'Hiking', 'Photography'],
      recommendedTime: '2-3 hours',
      bestTime: 'Early morning (6-9 AM)',
    },
    {
      id: 's3',
      placeId: '1',
      title: 'Mount Batur Sunrise',
      images: ['PP3.png'],
      description: 'Active volcano offering spectacular sunrise views after an early morning hike',
      tags: ['Hiking', 'Sunrise', 'Volcano'],
      recommendedTime: '4-5 hours',
      bestTime: 'Early morning (2-6 AM)',
    },
  ],
  '2': [
    {
      id: 's4',
      placeId: '2',
      title: 'Shibuya Crossing',
      images: ['PP1.png'],
      description: 'World\'s busiest pedestrian crossing, a symbol of Tokyo\'s energy',
      tags: ['City', 'Iconic', 'Photography'],
      recommendedTime: '30 minutes',
      bestTime: 'Evening rush hour',
    },
    {
      id: 's5',
      placeId: '2',
      title: 'Senso-ji Temple',
      images: ['PP2.png'],
      description: 'Tokyo\'s oldest temple with vibrant Nakamise shopping street',
      tags: ['Temple', 'Shopping', 'Culture'],
      recommendedTime: '1-2 hours',
    },
  ],
};

// Mock 美食数据
const mockFoods: Record<string, FoodItem[]> = {
  '1': [
    {
      id: 'f1',
      placeId: '1',
      name: 'Babi Guling',
      images: ['PP1.png'],
      description: 'Traditional Balinese roasted suckling pig, crispy skin with tender meat',
      location: 'Warung Babi Guling Ibu Oka, Ubud',
      priceLevel: '$$',
      tags: ['Traditional', 'Pork', 'Spicy'],
    },
    {
      id: 'f2',
      placeId: '1',
      name: 'Nasi Campur',
      images: ['PP2.png'],
      description: 'Mixed rice with various side dishes, a staple of Balinese cuisine',
      priceLevel: '$',
      tags: ['Rice', 'Traditional'],
    },
  ],
  '2': [
    {
      id: 'f3',
      placeId: '2',
      name: 'Sushi Omakase',
      images: ['PP3.png'],
      description: 'Chef\'s selection of premium sushi, an authentic Tokyo dining experience',
      location: 'Sukiyabashi Jiro, Ginza',
      priceLevel: '$$$',
      tags: ['Sushi', 'Fine Dining', 'Seafood'],
    },
  ],
};

// Mock 路线数据
const mockRoutes: Record<string, RouteItem[]> = {
  '1': [
    {
      id: 'r1',
      placeId: '1',
      title: 'Classic Bali 5-Day Itinerary',
      days: 5,
      steps: [
        'Day 1: Arrival in Denpasar, transfer to Ubud',
        'Day 2: Ubud Rice Terraces, Monkey Forest, Tegenungan Waterfall',
        'Day 3: Mount Batur sunrise hike, hot springs',
        'Day 4: Tanah Lot Temple, Seminyak Beach',
        'Day 5: Departure',
      ],
      tips: 'Best time to visit: April to October (dry season)',
    },
  ],
  '2': [
    {
      id: 'r2',
      placeId: '2',
      title: 'Tokyo Highlights 3-Day Tour',
      days: 3,
      steps: [
        'Day 1: Shibuya, Harajuku, Meiji Shrine',
        'Day 2: Senso-ji Temple, Asakusa, Tokyo Skytree',
        'Day 3: Tsukiji Fish Market, Ginza, Imperial Palace',
      ],
      tips: 'Get a JR Pass for convenient travel between districts',
    },
  ],
};

// Mock 评论数据
const mockComments: Record<string, CommentItem[]> = {
  '1': [
    {
      id: 'c1',
      placeId: '1',
      userId: 'u1',
      userName: 'Traveler123',
      userAvatar: '',
      content: 'Bali is absolutely stunning! The beaches are pristine and the culture is rich. Highly recommend visiting Ubud for the rice terraces.',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'c2',
      placeId: '1',
      userId: 'u2',
      userName: 'Wanderlust',
      userAvatar: '',
      content: 'The sunset at Tanah Lot was magical! Make sure to arrive early to get a good spot.',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  '2': [
    {
      id: 'c3',
      placeId: '2',
      userId: 'u3',
      userName: 'TokyoExplorer',
      userAvatar: '',
      content: 'Tokyo never disappoints! The food scene is incredible, especially the sushi.',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

// ==================== API 函数 ====================

/**
 * 获取热门地点列表
 */
export async function getPopularPlaces(): Promise<Place[]> {
  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, 300));
  return [...mockPlaces].slice(0, 3); // 返回前3个作为热门
}

/**
 * 获取附近地点列表
 * @param lat 纬度
 * @param lng 经度
 */
export async function getNearestPlaces(lat?: number, lng?: number): Promise<Place[]> {
  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, 300));
  
  // 如果有位置信息，可以根据距离排序
  // 这里简单返回所有地点
  return [...mockPlaces].slice(3); // 返回后面的作为附近
}

/**
 * 根据地点ID获取地点详情
 */
export async function getPlaceById(placeId: string): Promise<Place | null> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return mockPlaces.find((p) => p.id === placeId) || null;
}

/**
 * 根据地点获取景点介绍
 */
export async function getSightsByPlace(placeId: string): Promise<SightItem[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return mockSights[placeId] || [];
}

/**
 * 根据地点获取美食品类
 */
export async function getFoodsByPlace(placeId: string): Promise<FoodItem[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return mockFoods[placeId] || [];
}

/**
 * 根据地点获取推荐路线
 */
export async function getRoutesByPlace(placeId: string): Promise<RouteItem[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return mockRoutes[placeId] || [];
}

/**
 * 根据地点获取评论
 */
export async function getCommentsByPlace(placeId: string): Promise<CommentItem[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return mockComments[placeId] || [];
}

/**
 * 发布评论
 */
export async function postComment(placeId: string, content: string): Promise<CommentItem> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  const newComment: CommentItem = {
    id: `c${Date.now()}`,
    placeId,
    userId: 'current-user', // 应该从认证服务获取
    userName: 'You',
    userAvatar: '',
    content,
    createdAt: new Date().toISOString(),
  };
  
  // 添加到mock数据
  if (!mockComments[placeId]) {
    mockComments[placeId] = [];
  }
  mockComments[placeId].unshift(newComment);
  
  return newComment;
}

/**
 * 点赞/取消点赞地点
 */
export async function toggleLikePlace(placeId: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const place = mockPlaces.find((p) => p.id === placeId);
  if (place) {
    // 这里应该从用户状态判断是点赞还是取消
    // 简化处理：每次调用切换状态
    place.stats.likeCount += 1;
  }
}

/**
 * 收藏/取消收藏地点
 */
export async function toggleFavoritePlace(placeId: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const place = mockPlaces.find((p) => p.id === placeId);
  if (place) {
    place.stats.favoriteCount += 1;
  }
}

/**
 * 搜索地点
 */
export async function searchPlaces(query: string): Promise<Place[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const lowerQuery = query.toLowerCase();
  return mockPlaces.filter(
    (place) =>
      place.name.toLowerCase().includes(lowerQuery) ||
      place.country.toLowerCase().includes(lowerQuery) ||
      place.city?.toLowerCase().includes(lowerQuery) ||
      place.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}
