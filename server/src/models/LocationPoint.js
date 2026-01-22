const { db } = require('../db/database');
const CityVisit = require('./CityVisit');

/**
 * 位置点模型
 */
class LocationPoint {
  /**
   * 保存位置点
   */
  static async save(userId, locationData) {
    try {
      const { latitude, longitude, timestamp, accuracy, speed, heading } = locationData;

      // 优先使用客户端传来的城市/省份（iOS 模拟器可用逆地理编码拿到），
      // 但无论来源如何，最终都要在服务端做一次统一规范，避免出现
      // 「自贡 / 自贡市」「四川 / 四川省」导致的重复城市。
      let cityName = locationData.cityName;
      let provinceName = locationData.provinceName;

      // 如果客户端没传，则使用后端兜底（高德逆地理编码）
      if (!cityName || !provinceName) {
        const resolved = await CityVisit.getCityByLocation(latitude, longitude);
        cityName = cityName || resolved.cityName;
        provinceName = provinceName || resolved.provinceName;
      }

      // 统一规范城市 / 省份名称，确保相同城市只会进一条记录
      const normalizeCityName = (name) => {
        if (!name) return '未知城市';
        let n = String(name).trim();
        // 如果已经是「XX市」「XX区」「XX县」则保持不变
        if (/[市区县]$/.test(n)) return n;
        // 常见直辖市 / 特殊城市直接保持高德返回
        const specialCities = ['北京', '上海', '天津', '重庆', '香港', '澳门'];
        if (specialCities.includes(n)) return `${n}市`;
        return `${n}市`;
      };

      const normalizeProvinceName = (name) => {
        if (!name) return '未知省份';
        let n = String(name).trim();

        const municipalities = ['北京', '天津', '上海', '重庆'];
        const specialRegions = ['香港', '澳门'];

        const muni = municipalities.find((m) => n.startsWith(m));
        if (muni) return muni; // 统一为「北京」「上海」等

        const special = specialRegions.find((s) => n.startsWith(s));
        if (special) return `${special}特别行政区`;

        if (n.endsWith('自治区') || n.endsWith('特别行政区')) return n;
        if (!n.endsWith('省')) n = `${n}省`;
        return n;
      };

      cityName = normalizeCityName(cityName);
      provinceName = normalizeProvinceName(provinceName);

      // 保存位置点
      // 规范化可选字段，避免 undefined 触发参数数量错误
      const normalizedAccuracy = accuracy ?? null;
      const normalizedSpeed = speed ?? null;
      const normalizedHeading = heading ?? null;
      const normalizeStr = (val, fallback) => {
        if (Array.isArray(val)) {
          const hit = val.find((v) => typeof v === 'string' && v.trim().length > 0);
          return hit || fallback;
        }
        if (typeof val === 'string' && val.trim().length > 0) return val.trim();
        return fallback;
      };
      const normalizedCityName = normalizeStr(cityName, '未知城市');
      const normalizedProvinceName = normalizeStr(provinceName, '未知省份');

      const params = [
        userId,
        latitude,
        longitude,
        timestamp,
        normalizedAccuracy,
        normalizedSpeed,
        normalizedHeading,
        normalizedCityName,
        normalizedProvinceName,
      ];
      console.debug('location_points insert params count:', params.length, params);

      const result = db
        .prepare(
          `INSERT INTO location_points 
           (user_id, latitude, longitude, timestamp, accuracy, speed, heading, city_name, province_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(...params);

      // 检查是否需要更新城市访问记录（同样使用规范化后的名称）
      await this.updateCityVisit(
        userId,
        latitude,
        longitude,
        timestamp,
        normalizedCityName,
        normalizedProvinceName
      );

      return {
        id: result.lastInsertRowid,
        ...locationData,
        cityName: normalizedCityName,
        provinceName: normalizedProvinceName,
      };
    } catch (error) {
      console.error('保存位置点失败:', error);
      throw error;
    }
  }

  /**
   * 更新城市访问记录
   */
  static async updateCityVisit(userId, latitude, longitude, timestamp, cityName, provinceName) {
    try {
      // 找到“这次上传之前”的同城最后一个点（避免查到刚插入的自己导致 stayHours≈0 且不记录）
      const previousPointInSameCity = db
        .prepare(
          `SELECT * FROM location_points 
           WHERE user_id = ? AND city_name = ? AND timestamp < ?
           ORDER BY timestamp DESC 
           LIMIT 1`
        )
        .get(userId, cityName, timestamp);

      if (previousPointInSameCity) {
        // 计算停留时间（小时）
        const timeDiff = timestamp - previousPointInSameCity.timestamp;
        const stayHours = timeDiff / (1000 * 60 * 60); // 转换为小时

        // 每次定位点都累计停留（stayHours 可能很小），由点亮规则在 CityVisit 里决定何时点亮
        await CityVisit.recordVisit(userId, cityName, provinceName, latitude, longitude, stayHours);
      } else {
        // 首次访问该城市，记录访问（停留时间设为0）
        await CityVisit.recordVisit(
          userId,
          cityName,
          provinceName,
          latitude,
          longitude,
          0
        );
      }
    } catch (error) {
      console.error('更新城市访问记录失败:', error);
    }
  }

  /**
   * 获取用户的位置轨迹
   */
  static async getTrajectory(userId, startDate, endDate) {
    try {
      let query = `SELECT latitude, longitude, timestamp, accuracy, speed, heading
                   FROM location_points
                   WHERE user_id = ?`;
      const params = [userId];

      if (startDate) {
        query += ' AND timestamp >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND timestamp <= ?';
        params.push(endDate);
      }

      query += ' ORDER BY timestamp ASC';

      const points = db.prepare(query).all(...params);

      return points.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        timestamp: point.timestamp,
        accuracy: point.accuracy,
        speed: point.speed,
        heading: point.heading,
      }));
    } catch (error) {
      console.error('获取轨迹失败:', error);
      throw error;
    }
  }
}

module.exports = LocationPoint;
