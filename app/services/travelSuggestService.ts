import { API_CONFIG } from '@/config/api';
import { authService } from './authService';

const API_BASE_URL = API_CONFIG.BASE_URL;

export interface TravelSuggestion {
  country: string;
  city: string;
  activities: string[];
  days: number;
}

export interface TravelDNA {
  types?: string[];
  budget?: string;
  pace?: string;
  environment?: string[];
  wishlist?: string;
}

/**
 * 调用后端 API 生成旅行建议
 */
export async function getTravelSuggestions(
  travelDNA: TravelDNA
): Promise<TravelSuggestion[]> {
  try {
    const token = await authService.getToken();
    if (!token) {
      throw new Error('未登录，请先登录');
    }

    const response = await fetch(`${API_BASE_URL}/ai/travel-suggest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ travelDNA }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || '获取旅行建议失败');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || '获取旅行建议失败');
    }

    return data.suggestions || [];
  } catch (error) {
    console.error('获取旅行建议失败:', error);
    throw error;
  }
}
