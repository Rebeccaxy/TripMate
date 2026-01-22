/**
 * 用户互动服务
 * 管理用户的点赞和收藏状态，与AsyncStorage同步
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPlaceById, type Place } from './communityService';

const LIKED_PLACES_KEY = '@tripMate:likedPlaces';
const FAVORITED_PLACES_KEY = '@tripMate:favoritedPlaces';

/**
 * 获取用户点赞的地点ID列表
 */
export async function getLikedPlaceIds(): Promise<string[]> {
  try {
    const json = await AsyncStorage.getItem(LIKED_PLACES_KEY);
    if (json) {
      return JSON.parse(json);
    }
    return [];
  } catch (error) {
    console.error('获取点赞列表失败:', error);
    return [];
  }
}

/**
 * 获取用户收藏的地点ID列表
 */
export async function getFavoritedPlaceIds(): Promise<string[]> {
  try {
    const json = await AsyncStorage.getItem(FAVORITED_PLACES_KEY);
    if (json) {
      return JSON.parse(json);
    }
    return [];
  } catch (error) {
    console.error('获取收藏列表失败:', error);
    return [];
  }
}

/**
 * 设置点赞的地点ID列表
 */
export async function setLikedPlaceIds(placeIds: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(LIKED_PLACES_KEY, JSON.stringify(placeIds));
  } catch (error) {
    console.error('保存点赞列表失败:', error);
  }
}

/**
 * 设置收藏的地点ID列表
 */
export async function setFavoritedPlaceIds(placeIds: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(FAVORITED_PLACES_KEY, JSON.stringify(placeIds));
  } catch (error) {
    console.error('保存收藏列表失败:', error);
  }
}

/**
 * 切换点赞状态
 */
export async function toggleLikePlace(placeId: string): Promise<boolean> {
  try {
    const likedIds = await getLikedPlaceIds();
    const isLiked = likedIds.includes(placeId);
    
    if (isLiked) {
      // 取消点赞
      const newIds = likedIds.filter(id => id !== placeId);
      await setLikedPlaceIds(newIds);
      return false;
    } else {
      // 添加点赞
      const newIds = [...likedIds, placeId];
      await setLikedPlaceIds(newIds);
      return true;
    }
  } catch (error) {
    console.error('切换点赞状态失败:', error);
    throw error;
  }
}

/**
 * 切换收藏状态
 */
export async function toggleFavoritePlace(placeId: string): Promise<boolean> {
  try {
    const favoritedIds = await getFavoritedPlaceIds();
    const isFavorited = favoritedIds.includes(placeId);
    
    if (isFavorited) {
      // 取消收藏
      const newIds = favoritedIds.filter(id => id !== placeId);
      await setFavoritedPlaceIds(newIds);
      return false;
    } else {
      // 添加收藏
      const newIds = [...favoritedIds, placeId];
      await setFavoritedPlaceIds(newIds);
      return true;
    }
  } catch (error) {
    console.error('切换收藏状态失败:', error);
    throw error;
  }
}

/**
 * 获取点赞的地点列表
 */
export async function getLikedPlaces(): Promise<Place[]> {
  try {
    const placeIds = await getLikedPlaceIds();
    console.log('[用户互动] 获取到的点赞地点ID列表:', placeIds);
    const places = await Promise.all(
      placeIds.map(async (id) => {
        const place = await getPlaceById(id);
        if (!place) {
          console.warn(`[用户互动] 地点ID ${id} 未找到，可能已被删除`);
        }
        return place;
      })
    );
    const validPlaces = places.filter((place): place is Place => place !== null);
    console.log(`[用户互动] 成功获取 ${validPlaces.length}/${placeIds.length} 个点赞地点`);
    return validPlaces;
  } catch (error) {
    console.error('获取点赞地点列表失败:', error);
    return [];
  }
}

/**
 * 获取收藏的地点列表
 */
export async function getFavoritedPlaces(): Promise<Place[]> {
  try {
    const placeIds = await getFavoritedPlaceIds();
    console.log('[用户互动] 获取到的收藏地点ID列表:', placeIds);
    const places = await Promise.all(
      placeIds.map(async (id) => {
        const place = await getPlaceById(id);
        if (!place) {
          console.warn(`[用户互动] 地点ID ${id} 未找到，可能已被删除`);
        }
        return place;
      })
    );
    const validPlaces = places.filter((place): place is Place => place !== null);
    console.log(`[用户互动] 成功获取 ${validPlaces.length}/${placeIds.length} 个收藏地点`);
    return validPlaces;
  } catch (error) {
    console.error('获取收藏地点列表失败:', error);
    return [];
  }
}

/**
 * 检查地点是否已点赞
 */
export async function isPlaceLiked(placeId: string): Promise<boolean> {
  const likedIds = await getLikedPlaceIds();
  return likedIds.includes(placeId);
}

/**
 * 检查地点是否已收藏
 */
export async function isPlaceFavorited(placeId: string): Promise<boolean> {
  const favoritedIds = await getFavoritedPlaceIds();
  return favoritedIds.includes(placeId);
}
