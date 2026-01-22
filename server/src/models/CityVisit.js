const { db } = require('../db/database');

/**
 * 城市访问记录模型
 */
class CityVisit {
  // 简单内存缓存，减少频繁逆地理编码请求（key: "lng,lat" 取 5 位小数）
  static #regeoCache = new Map();

  static #cacheKey(latitude, longitude) {
    // location=经度,纬度
    const lng = Number(longitude);
    const lat = Number(latitude);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    return `${lng.toFixed(5)},${lat.toFixed(5)}`;
  }

  /**
   * 根据位置点获取城市和省份名称
   * 使用高德地图逆地理编码 API
   */
  static async getCityByLocation(latitude, longitude) {
    const fallback = { cityName: '未知城市', provinceName: '未知省份' };
    const apiKey = process.env.GAODE_API_KEY;

    // 没配置 Key 就直接返回占位
    if (!apiKey) {
      console.warn('高德API未配置（GAODE_API_KEY），将返回未知城市');
      return fallback;
    }

    try {
      const key = this.#cacheKey(latitude, longitude);
      if (key && this.#regeoCache.has(key)) {
        const cached = this.#regeoCache.get(key);
        console.debug('[gaode-regeo] cache hit', { key, cached });
        return cached;
      }

      // 高德逆地理编码：https://restapi.amap.com/v3/geocode/regeo
      const url = new URL('https://restapi.amap.com/v3/geocode/regeo');
      url.searchParams.set('key', apiKey);
      url.searchParams.set('location', `${longitude},${latitude}`); // 经度,纬度
      url.searchParams.set('radius', '1000');
      url.searchParams.set('extensions', 'base');
      url.searchParams.set('output', 'JSON');

      const startedAt = Date.now();
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutMs = Number(process.env.GAODE_REVERSE_GEOCODE_TIMEOUT_MS || 5000);
      const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

      console.info('[gaode-regeo] request', {
        location: `${longitude},${latitude}`,
        timeoutMs,
      });

      const res = await fetch(url.toString(), controller ? { signal: controller.signal } : undefined);
      if (timer) clearTimeout(timer);

      const durationMs = Date.now() - startedAt;
      const text = await res.text();

      console.info('[gaode-regeo] response', {
        status: res.status,
        ok: res.ok,
        durationMs,
        // 只截取前 300 字符，避免日志过大
        preview: text?.slice?.(0, 300),
      });

      if (!res.ok) return fallback;

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.warn('[gaode-regeo] invalid json', { error: e?.message });
        return fallback;
      }

      if (data?.status !== '1' || !data?.regeocode?.addressComponent) {
        console.warn('[gaode-regeo] api error', {
          status: data?.status,
          info: data?.info,
          infocode: data?.infocode,
        });
        return fallback;
      }

      const comp = data.regeocode.addressComponent;
      const pickStr = (val) => {
        if (Array.isArray(val)) return val.find((v) => !!v) || '';
        if (typeof val === 'string') return val;
        return '';
      };

      // city 在直辖市可能为空/数组，使用 district/township/province 兜底
      const city =
        pickStr(comp.city) ||
        pickStr(comp.district) ||
        pickStr(comp.township) ||
        pickStr(comp.province) ||
        fallback.cityName;
      const province = pickStr(comp.province) || pickStr(comp.city) || fallback.provinceName;
      
      // 统一规范省份名称，避免「四川」/「四川省」导致重复城市
      const normalizeProvinceName = (name) => {
        if (!name) return fallback.provinceName;
        let n = String(name).trim();

        const municipalities = ['北京', '天津', '上海', '重庆'];
        const specialRegions = ['香港', '澳门'];

        // 直辖市：统一为「北京」「上海」等简写形式
        const muni = municipalities.find((m) => n.startsWith(m));
        if (muni) {
          return muni;
        }

        // 特别行政区：统一为「香港特别行政区」「澳门特别行政区」
        const special = specialRegions.find((s) => n.startsWith(s));
        if (special) {
          return `${special}特别行政区`;
        }

        // 自治区：只要已经带「自治区」就不再处理
        if (n.endsWith('自治区') || n.endsWith('特别行政区')) {
          return n;
        }

        // 普通省份：统一加上「省」后缀（例如「四川」->「四川省」）
        if (!n.endsWith('省')) {
          n = `${n}省`;
        }
        return n;
      };

      const normalizedProvince = normalizeProvinceName(province || fallback.provinceName);

      const result = {
        cityName: city || fallback.cityName,
        provinceName: normalizedProvince,
      };
      if (key) this.#regeoCache.set(key, result);
      return result;
    } catch (error) {
      console.error('[gaode-regeo] request failed:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        location: `${longitude},${latitude}`,
      });
      return fallback;
    }
  }

  /**
   * 记录或更新城市访问
   */
  static async recordVisit(userId, cityName, provinceName, latitude, longitude, stayHours = 0) {
    try {
      const now = new Date().toISOString();
      
      // 检查是否已有该城市的访问记录
      const existing = db
        .prepare(
          `SELECT * FROM city_visits 
           WHERE user_id = ? AND city_name = ? AND province_name = ?`
        )
        .get(userId, cityName, provinceName);

      if (existing) {
        // 更新现有记录
        const newVisitCount = existing.visit_count + 1;
        const newTotalStayHours = existing.total_stay_hours + stayHours;
        
        // 判断是否应该点亮（根据业务规则）
        // 规则：累计到访2次，或连续停留48小时以上
        let isLighted = existing.is_lighted;
        if (!isLighted) {
          if (newVisitCount >= 2) {
            // 累计到访2次，第二天点亮
            isLighted = 1;
          } else if (newTotalStayHours >= 48) {
            // 累计停留48小时以上，直接点亮
            isLighted = 1;
          }
        }

        db.prepare(
          `UPDATE city_visits 
           SET last_visit_date = ?,
               visit_count = ?,
               total_stay_hours = ?,
               is_lighted = ?,
               updated_at = ?
           WHERE id = ?`
        ).run(now, newVisitCount, newTotalStayHours, isLighted, now, existing.id);

        return {
          id: existing.id,
          cityName,
          provinceName,
          firstVisitDate: existing.first_visit_date,
          lastVisitDate: now,
          visitCount: newVisitCount,
          totalStayHours: newTotalStayHours,
          isLighted: isLighted === 1,
          latitude,
          longitude,
        };
      } else {
        // 创建新记录
        const result = db
          .prepare(
            `INSERT INTO city_visits 
             (user_id, city_name, province_name, latitude, longitude, 
              first_visit_date, last_visit_date, visit_count, total_stay_hours, is_lighted)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 0)`
          )
          .run(
            userId,
            cityName,
            provinceName,
            latitude,
            longitude,
            now,
            now,
            stayHours
          );

        return {
          id: result.lastInsertRowid,
          cityName,
          provinceName,
          firstVisitDate: now,
          lastVisitDate: now,
          visitCount: 1,
          totalStayHours: stayHours,
          isLighted: false,
          latitude,
          longitude,
        };
      }
    } catch (error) {
      console.error('记录城市访问失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的所有城市访问记录
   */
  static async getUserCityVisits(userId) {
    try {
      const visits = db
        .prepare(
          `SELECT id, city_name, province_name, latitude, longitude,
                  first_visit_date, last_visit_date, visit_count, 
                  total_stay_hours, is_lighted
           FROM city_visits
           WHERE user_id = ?
           ORDER BY last_visit_date DESC`
        )
        .all(userId);

      return visits.map((visit) => ({
        id: visit.id,
        cityName: visit.city_name,
        provinceName: visit.province_name,
        latitude: visit.latitude,
        longitude: visit.longitude,
        firstVisitDate: visit.first_visit_date,
        lastVisitDate: visit.last_visit_date,
        visitCount: visit.visit_count,
        totalStayHours: visit.total_stay_hours,
        isLighted: visit.is_lighted === 1,
      }));
    } catch (error) {
      console.error('获取城市访问记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户已点亮的城市
   */
  static async getLightedCities(userId) {
    try {
      const visits = db
        .prepare(
          `SELECT id, city_name, province_name, latitude, longitude,
                  first_visit_date, last_visit_date, visit_count, 
                  total_stay_hours
           FROM city_visits
           WHERE user_id = ? AND is_lighted = 1
           ORDER BY last_visit_date DESC`
        )
        .all(userId);

      return visits.map((visit) => ({
        id: visit.id,
        cityName: visit.city_name,
        provinceName: visit.province_name,
        latitude: visit.latitude,
        longitude: visit.longitude,
        firstVisitDate: visit.first_visit_date,
        lastVisitDate: visit.last_visit_date,
        visitCount: visit.visit_count,
        totalStayHours: visit.total_stay_hours,
        isLighted: true,
      }));
    } catch (error) {
      console.error('获取已点亮城市失败:', error);
      throw error;
    }
  }

  /**
   * 获取城市详情
   */
  static async getCityDetails(userId, cityId) {
    try {
      const visit = db
        .prepare(
          `SELECT id, city_name, province_name, latitude, longitude,
                  first_visit_date, last_visit_date, visit_count, 
                  total_stay_hours, is_lighted
           FROM city_visits
           WHERE id = ? AND user_id = ?`
        )
        .get(cityId, userId);

      if (!visit) {
        return null;
      }

      return {
        id: visit.id,
        cityName: visit.city_name,
        provinceName: visit.province_name,
        latitude: visit.latitude,
        longitude: visit.longitude,
        firstVisitDate: visit.first_visit_date,
        lastVisitDate: visit.last_visit_date,
        visitCount: visit.visit_count,
        totalStayHours: visit.total_stay_hours,
        isLighted: visit.is_lighted === 1,
      };
    } catch (error) {
      console.error('获取城市详情失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户足迹统计
   */
  static async getStats(userId) {
    try {
      // 获取已访问城市数量（所有城市，不限于点亮）
      const visitedCities = db
        .prepare(
          `SELECT COUNT(*) as count FROM city_visits 
           WHERE user_id = ?`
        )
        .get(userId);

      // 获取已访问省份数量（去重）
      const provinces = db
        .prepare(
          `SELECT COUNT(DISTINCT province_name) as count FROM city_visits 
           WHERE user_id = ?`
        )
        .get(userId);

      // 获取总距离（简化计算，实际应该计算轨迹总长度）
      const totalDistance = 0; // TODO: 计算轨迹总距离

      // 获取位置追踪开启天数（统计 location_points 表中有位置点的不同日期数量）
      // timestamp 是毫秒时间戳，需要除以1000转换为秒
      const trackingDays = db
        .prepare(
          `SELECT COUNT(DISTINCT DATE(datetime(timestamp / 1000, 'unixepoch'))) as count
           FROM location_points
           WHERE user_id = ?`
        )
        .get(userId);

      return {
        totalCities: visitedCities?.count || 0,
        totalProvinces: provinces?.count || 0,
        totalDistance: totalDistance,
        trackingDays: trackingDays?.count || 0,
      };
    } catch (error) {
      console.error('获取统计信息失败:', error);
      throw error;
    }
  }
}

module.exports = CityVisit;
