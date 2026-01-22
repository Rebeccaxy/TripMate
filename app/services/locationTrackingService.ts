import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '@/config/api';
import { authService } from './authService';

const LOCATION_TASK_NAME = 'background-location-task';
const LOCATION_STORAGE_KEY = 'location_tracking_enabled';
const LOCATION_INTERVAL = 5 * 60 * 1000; // 5分钟采集一次（静止时）
const MOVING_INTERVAL = 1 * 60 * 1000; // 1分钟采集一次（移动时）

export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  cityName?: string;
  provinceName?: string;
}

/**
 * 位置追踪服务
 * 负责收集用户的位置轨迹，并根据运动状态调整采样频率
 */
class LocationTrackingService {
  private isTracking = false;
  private lastLocation: LocationPoint | null = null;
  private currentCity: string | null = null;
  private trackingInterval: NodeJS.Timeout | null = null;

  /**
   * 初始化位置追踪服务
   */
  async initialize(): Promise<void> {
    // 检查是否已启用追踪
    const enabled = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
    if (enabled === 'true') {
      await this.startTracking();
    }
  }

  /**
   * 请求定位权限
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.warn('前台定位权限被拒绝');
        return false;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.warn('后台定位权限被拒绝，将仅在前台追踪位置');
      }

      return true;
    } catch (error) {
      console.error('请求定位权限失败:', error);
      return false;
    }
  }

  /**
   * 检查定位权限状态
   */
  async checkPermissions(): Promise<{
    foreground: boolean;
    background: boolean;
  }> {
    const foregroundStatus = await Location.getForegroundPermissionsAsync();
    const backgroundStatus = await Location.getBackgroundPermissionsAsync();

    return {
      foreground: foregroundStatus.granted,
      background: backgroundStatus.granted,
    };
  }

  /**
   * 开始位置追踪
   */
  async startTracking(): Promise<boolean> {
    if (this.isTracking) {
      console.log('位置追踪已在运行');
      return true;
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      return false;
    }

    try {
      // 设置后台定位任务
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: LOCATION_INTERVAL,
        distanceInterval: 100, // 移动100米后更新
        foregroundService: {
          notificationTitle: 'TripMate 正在记录您的足迹',
          notificationBody: '应用正在后台记录您的位置信息',
        },
      });

      // 前台定位追踪
      this.trackingInterval = setInterval(async () => {
        await this.collectLocation();
      }, LOCATION_INTERVAL);

      // 立即收集一次位置
      await this.collectLocation();

      this.isTracking = true;
      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, 'true');
      console.log('位置追踪已启动');
      return true;
    } catch (error) {
      console.error('启动位置追踪失败:', error);
      return false;
    }
  }

  /**
   * 停止位置追踪
   */
  async stopTracking(): Promise<void> {
    if (!this.isTracking) {
      return;
    }

    try {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      
      if (this.trackingInterval) {
        clearInterval(this.trackingInterval);
        this.trackingInterval = null;
      }

      this.isTracking = false;
      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, 'false');
      console.log('位置追踪已停止');
    } catch (error) {
      console.error('停止位置追踪失败:', error);
    }
  }

  /**
   * 收集当前位置
   */
  private async collectLocation(): Promise<void> {
    try {
      console.log('📍 [位置追踪] 开始获取当前位置...');
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // 逆地理编码（可能失败/无网络，失败则使用未知）
      let cityName: string | undefined;
      let provinceName: string | undefined;
      try {
        const reversed = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        const first = reversed?.[0];
        cityName = (first?.city || first?.subregion || first?.district) ?? undefined;
        provinceName = (first?.region || first?.country) ?? undefined;
      } catch (e) {
        // ignore
      }

      const locationPoint: LocationPoint = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: Date.now(),
        accuracy: location.coords.accuracy || undefined,
        speed: location.coords.speed || undefined,
        heading: location.coords.heading || undefined,
        cityName,
        provinceName,
      };

      console.log('✅ [位置追踪] 成功获取位置:');
      console.log(`   纬度: ${locationPoint.latitude.toFixed(6)}`);
      console.log(`   经度: ${locationPoint.longitude.toFixed(6)}`);
      console.log(`   精度: ${locationPoint.accuracy ? locationPoint.accuracy.toFixed(2) + '米' : '未知'}`);
      console.log(`   速度: ${locationPoint.speed !== undefined ? (locationPoint.speed * 3.6).toFixed(2) + ' km/h' : '未知'}`);
      console.log(`   时间戳: ${new Date(locationPoint.timestamp).toLocaleString('zh-CN')}`);

      // 判断是否在移动
      const isMoving = this.isLocationMoving(locationPoint);
      console.log(`   运动状态: ${isMoving ? '🚶 移动中' : '⏸️ 静止'}`);
      
      // 上传位置到服务器
      await this.uploadLocation(locationPoint);

      // 更新最后位置
      this.lastLocation = locationPoint;

      // 根据运动状态调整采样频率
      if (isMoving && this.trackingInterval) {
        clearInterval(this.trackingInterval);
        this.trackingInterval = setInterval(async () => {
          await this.collectLocation();
        }, MOVING_INTERVAL);
        console.log(`   ⚙️ 采样频率已调整为: ${MOVING_INTERVAL / 1000}秒（移动模式）`);
      } else if (!isMoving && this.trackingInterval) {
        clearInterval(this.trackingInterval);
        this.trackingInterval = setInterval(async () => {
          await this.collectLocation();
        }, LOCATION_INTERVAL);
        console.log(`   ⚙️ 采样频率已调整为: ${LOCATION_INTERVAL / 1000}秒（静止模式）`);
      }
    } catch (error) {
      console.error('❌ [位置追踪] 收集位置失败:', error);
      if (error instanceof Error) {
        console.error(`   错误信息: ${error.message}`);
      }
    }
  }

  /**
   * 判断位置是否在移动
   */
  private isLocationMoving(currentLocation: LocationPoint): boolean {
    if (!this.lastLocation) {
      return false;
    }

    // 如果有速度信息，使用速度判断
    if (currentLocation.speed !== undefined && currentLocation.speed > 0.5) {
      return true;
    }

    // 否则根据位置变化判断（简单距离计算）
    const distance = this.calculateDistance(
      this.lastLocation.latitude,
      this.lastLocation.longitude,
      currentLocation.latitude,
      currentLocation.longitude
    );

    // 如果5分钟内移动超过100米，认为在移动
    const timeDiff = currentLocation.timestamp - this.lastLocation.timestamp;
    if (timeDiff > 0 && distance / (timeDiff / 1000) > 0.03) { // 0.03 m/s = 约0.1 km/h
      return true;
    }

    return false;
  }

  /**
   * 计算两点间距离（米）
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // 地球半径（米）
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * 上传位置到服务器
   */
  async uploadLocation(location: LocationPoint): Promise<void> {
    try {
      console.log('🌐 [服务器连接] 开始连接服务器上传位置...');
      console.log(`   服务器地址: ${API_CONFIG.BASE_URL}/traces/location`);
      
      const token = await authService.getToken();
      if (!token) {
        console.warn('⚠️ [服务器连接] 未登录，无法上传位置');
        return;
      }
      console.log('✅ [服务器连接] Token已获取，准备发送请求...');

      // iOS 模拟器/部分设备会返回 -1 表示未知，这里转换为 undefined，避免后端校验失败
      const normalizedLocation: LocationPoint = {
        ...location,
        speed:
          location.speed !== undefined && location.speed !== null && location.speed >= 0
            ? location.speed
            : undefined,
        heading:
          location.heading !== undefined && location.heading !== null && location.heading >= 0
            ? location.heading
            : undefined,
      };

      const requestBody = JSON.stringify(normalizedLocation);
      console.log(`   请求体大小: ${requestBody.length} 字符`);

      const startTime = Date.now();
      const response = await fetch(`${API_CONFIG.BASE_URL}/traces/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: requestBody,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`🌐 [服务器连接] 收到响应 (耗时: ${duration}ms)`);
      console.log(`   状态码: ${response.status} ${response.statusText || ''}`);
      console.log(`   响应头: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);

      if (!response.ok) {
        // RN 下 statusText 可能是空字符串，这里补充状态码与响应体，便于排查 401/404/网络等问题
        const bodyText = await response.text().catch(() => '');
        console.error('❌ [服务器连接] 上传失败:');
        console.error(`   状态码: ${response.status}`);
        console.error(`   状态文本: ${response.statusText || '(empty)'}`);
        console.error(`   响应体: ${bodyText || '(empty)'}`);
        throw new Error(
          `上传位置失败: status=${response.status} statusText=${response.statusText || '(empty)'} body=${bodyText || '(empty)'}`
        );
      }

      const responseData = await response.json().catch(() => null);
      console.log('✅ [服务器连接] 位置上传成功！');
      console.log(`   响应数据: ${JSON.stringify(responseData)}`);
      console.log(
        `   位置: (${normalizedLocation.latitude.toFixed(6)}, ${normalizedLocation.longitude.toFixed(6)})`
      );
    } catch (error) {
      console.error('❌ [服务器连接] 上传位置失败:');
      if (error instanceof Error) {
        console.error(`   错误类型: ${error.name}`);
        console.error(`   错误信息: ${error.message}`);
        if (error.message.includes('Network request failed') || error.message.includes('Failed to fetch')) {
          console.error('   原因: 网络连接失败，请检查：');
          console.error('     1. 后端服务是否运行在 http://localhost:3000');
          console.error('     2. 如果使用真机，请将API地址改为电脑的局域网IP');
          console.error('     3. 防火墙是否阻止了连接');
        } else if (error.message.includes('401')) {
          console.error('   原因: 认证失败，请重新登录');
        } else if (error.message.includes('404')) {
          console.error('   原因: 接口不存在，请检查后端路由配置');
        }
      } else {
        console.error(`   未知错误: ${error}`);
      }
      // 失败时保存到本地，稍后重试
      await this.saveLocationToLocal(location);
    }
  }

  /**
   * 保存位置到本地（失败重试）
   */
  private async saveLocationToLocal(location: LocationPoint): Promise<void> {
    try {
      const key = `pending_location_${location.timestamp}`;
      await AsyncStorage.setItem(key, JSON.stringify(location));
    } catch (error) {
      console.error('保存位置到本地失败:', error);
    }
  }

  /**
   * 获取追踪状态
   */
  isTrackingEnabled(): boolean {
    return this.isTracking;
  }
}

// 注册后台定位任务
TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error('后台定位任务错误:', error);
    return;
  }

  if (data) {
    const { locations } = data as any;
    if (locations && locations.length > 0) {
      const location = locations[0];
      const locationPoint: LocationPoint = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: Date.now(),
        accuracy: location.coords.accuracy,
        speed: location.coords.speed,
        heading: location.coords.heading,
      };

      // 上传位置
      locationTrackingService.uploadLocation(locationPoint);
    }
  }
});

export const locationTrackingService = new LocationTrackingService();
