import { API_CONFIG } from '@/config/api';
import { authService } from './authService';

export interface CityVisit {
  id: number;
  cityName: string;
  provinceName: string;
  firstVisitDate: string;
  lastVisitDate: string;
  visitCount: number;
  totalStayHours: number;
  isLighted: boolean;
  latitude: number;
  longitude: number;
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

export interface TracesStats {
  totalCities: number;
  totalProvinces: number;
  totalDistance: number;
  trackingDays: number; // 位置追踪开启天数（有位置点的不同日期数量）
}

/**
 * 足迹服务
 * 负责与后端API交互，获取和管理用户的旅行足迹数据
 */
class TracesService {
  /**
   * 获取用户的所有足迹城市列表
   */
  async getCityVisits(): Promise<CityVisit[]> {
    try {
      console.log('🌐 [服务器连接] 开始获取城市访问列表...');
      console.log(`   服务器地址: ${API_CONFIG.BASE_URL}/traces/cities`);
      
      const token = await authService.getToken();
      if (!token) {
        console.error('❌ [服务器连接] 未登录，无法获取城市列表');
        throw new Error('未登录');
      }
      console.log('✅ [服务器连接] Token已获取');

      const startTime = Date.now();
      const response = await fetch(`${API_CONFIG.BASE_URL}/traces/cities`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`🌐 [服务器连接] 收到响应 (耗时: ${duration}ms)`);
      console.log(`   状态码: ${response.status} ${response.statusText || ''}`);

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        console.error('❌ [服务器连接] 获取城市列表失败:');
        console.error(`   状态码: ${response.status}`);
        console.error(`   响应体: ${bodyText || '(empty)'}`);
        throw new Error(`获取足迹列表失败: ${response.statusText}`);
      }

      const data = await response.json();
      const cities = data.cities || [];
      console.log(`✅ [服务器连接] 成功获取城市列表，共 ${cities.length} 个城市`);
      return cities;
    } catch (error) {
      console.error('❌ [服务器连接] 获取足迹列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取足迹统计信息
   */
  async getStats(): Promise<TracesStats> {
    try {
      console.log('🌐 [服务器连接] 开始获取足迹统计信息...');
      console.log(`   服务器地址: ${API_CONFIG.BASE_URL}/traces/stats`);

      const token = await authService.getToken();
      if (!token) {
        console.error('❌ [服务器连接] 未登录，无法获取统计信息');
        throw new Error('未登录');
      }

      const startTime = Date.now();
      const response = await fetch(`${API_CONFIG.BASE_URL}/traces/stats`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log(`🌐 [服务器连接] 收到响应 (耗时: ${Date.now() - startTime}ms)`);
      console.log(`   状态码: ${response.status} ${response.statusText || ''}`);

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        console.error('❌ [服务器连接] 获取统计信息失败:');
        console.error(`   响应体: ${bodyText || '(empty)'}`);
        throw new Error(`获取统计信息失败: status=${response.status} ${response.statusText || ''}`);
      }

      const data = await response.json();
      const stats: TracesStats = data.stats || {
        totalCities: 0,
        totalProvinces: 0,
        totalDistance: 0,
        totalDays: 0,
      };
      console.log('✅ [服务器连接] 足迹统计获取成功:', stats);
      return stats;
    } catch (error) {
      console.error('获取统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 上传位置点
   */
  async uploadLocation(location: LocationPoint): Promise<void> {
    try {
      console.log('🌐 [服务器连接] TracesService.uploadLocation 开始上传位置点...');
      console.log(`   服务器地址: ${API_CONFIG.BASE_URL}/traces/location`);
      const token = await authService.getToken();
      if (!token) {
        console.error('❌ [服务器连接] 未登录，无法上传位置点');
        throw new Error('未登录');
      }

      const startTime = Date.now();
      const response = await fetch(`${API_CONFIG.BASE_URL}/traces/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(location),
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        console.error(`🌐 [服务器连接] 收到响应 (耗时: ${Date.now() - startTime}ms)`);
        console.error(`   状态码: ${response.status} ${response.statusText || ''}`);
        console.error(`   响应体: ${bodyText || '(empty)'}`);
        throw new Error(`上传位置失败: status=${response.status} ${response.statusText || ''}`);
      }
      console.log(`✅ [服务器连接] TracesService.uploadLocation 上传成功 (耗时: ${Date.now() - startTime}ms)`);
    } catch (error) {
      console.error('上传位置失败:', error);
      throw error;
    }
  }

  /**
   * 获取位置轨迹（用于在地图上绘制路线）
   */
  async getLocationTrajectory(
    startDate?: number,
    endDate?: number
  ): Promise<LocationPoint[]> {
    try {
      console.log('🌐 [服务器连接] 开始获取位置轨迹...');
      const token = await authService.getToken();
      if (!token) {
        console.error('❌ [服务器连接] 未登录，无法获取轨迹');
        throw new Error('未登录');
      }

      const params = new URLSearchParams();
      if (startDate) {
        params.append('startDate', startDate.toString());
      }
      if (endDate) {
        params.append('endDate', endDate.toString());
      }

      const url = `${API_CONFIG.BASE_URL}/traces/trajectory?${params.toString()}`;
      console.log(`   服务器地址: ${url}`);

      const startTime = Date.now();
      const response = await fetch(
        url,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(`🌐 [服务器连接] 收到响应 (耗时: ${Date.now() - startTime}ms)`);
      console.log(`   状态码: ${response.status} ${response.statusText || ''}`);

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        console.error('❌ [服务器连接] 获取轨迹失败:');
        console.error(`   响应体: ${bodyText || '(empty)'}`);
        throw new Error(`获取轨迹失败: status=${response.status} ${response.statusText || ''}`);
      }

      const data = await response.json();
      const trajectory = data.trajectory || [];
      console.log(`✅ [服务器连接] 轨迹获取成功，共 ${trajectory.length} 个点`);
      return trajectory;
    } catch (error) {
      console.error('获取轨迹失败:', error);
      throw error;
    }
  }

  /**
   * 获取城市详细信息
   */
  async getCityDetails(cityId: number): Promise<CityVisit | null> {
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('未登录');
      }

      const response = await fetch(
        `${API_CONFIG.BASE_URL}/traces/cities/${cityId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`获取城市详情失败: ${response.statusText}`);
      }

      const data = await response.json();
      return data.city || null;
    } catch (error) {
      console.error('获取城市详情失败:', error);
      throw error;
    }
  }
}

export const tracesService = new TracesService();
