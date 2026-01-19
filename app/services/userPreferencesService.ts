import AsyncStorage from '@react-native-async-storage/async-storage';

// 用户偏好数据类型
export interface UserPreferences {
  // 交通偏好
  transportationPreference: 'economy' | 'comfort' | 'luxury' | 'flexible' | null;
  // 住宿类型
  accommodationType: 'budget' | 'mid-range' | 'luxury' | 'hostel' | 'flexible' | null;
  // 旅行节奏
  travelPace: 'relaxed' | 'moderate' | 'fast-paced' | 'flexible' | null;
  // 用户MBTI
  mbtiType: string | null; // 例如: 'INTJ', 'ENFP' 等
  // 开放态度（对新体验的开放程度）
  opennessToExperience: 'very-open' | 'moderate' | 'conservative' | 'flexible' | null;
  // 价格敏感度
  priceSensitivity: 'very-sensitive' | 'moderate' | 'not-sensitive' | 'flexible' | null;
  // 冒险项目态度
  adventureAttitude: 'love-adventure' | 'moderate' | 'prefer-safe' | 'flexible' | null;
  // 更新时间
  updatedAt: string;
}

// 存储键名
const PREFERENCES_STORAGE_KEY = '@tripMate:userPreferences';

// 防止递归调用的标志
let isSavingPreferences = false;

// 默认偏好设置
const defaultPreferences: UserPreferences = {
  transportationPreference: null,
  accommodationType: null,
  travelPace: null,
  mbtiType: null,
  opennessToExperience: null,
  priceSensitivity: null,
  adventureAttitude: null,
  updatedAt: new Date().toISOString(),
};

/**
 * 获取用户偏好
 */
export async function getUserPreferences(): Promise<UserPreferences> {
  try {
    console.log(`[用户偏好] 开始从 AsyncStorage 读取...`);
    const preferencesJson = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
    console.log(`[用户偏好] AsyncStorage 读取完成`);
    
    if (preferencesJson) {
      console.log(`[用户偏好] ✅ 找到已存储的偏好数据`);
      return JSON.parse(preferencesJson);
    }
    
    // 如果没有存储的数据，且当前不在保存过程中，才保存默认值（防止递归）
    if (!isSavingPreferences) {
      console.log(`[用户偏好] 未找到存储数据，直接保存默认值...`);
      try {
        isSavingPreferences = true;
        await AsyncStorage.setItem(
          PREFERENCES_STORAGE_KEY,
          JSON.stringify(defaultPreferences)
        );
        console.log(`[用户偏好] ✅ 默认值保存完成`);
      } catch (saveError) {
        console.error('[用户偏好] ⚠️ 保存默认值失败，但继续使用默认值:', saveError);
      } finally {
        isSavingPreferences = false;
      }
    } else {
      console.log(`[用户偏好] ⚠️ 正在保存中，跳过保存默认值以避免递归`);
    }
    return defaultPreferences;
  } catch (error) {
    console.error('[用户偏好] ❌ 获取用户偏好失败:', error);
    return defaultPreferences;
  }
}

/**
 * 保存用户偏好
 */
export async function saveUserPreferences(
  preferences: Partial<UserPreferences>
): Promise<void> {
  // 防止递归调用
  if (isSavingPreferences) {
    console.warn('[用户偏好] ⚠️ 正在保存中，跳过此次保存以避免递归');
    return;
  }

  try {
    isSavingPreferences = true;
    console.log(`[用户偏好] 开始保存用户偏好...`);
    
    // 直接读取 AsyncStorage，避免调用 getUserPreferences（防止递归）
    let currentPreferences: UserPreferences = defaultPreferences;
    try {
      const preferencesJson = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (preferencesJson) {
        currentPreferences = JSON.parse(preferencesJson);
      }
    } catch (readError) {
      console.warn('[用户偏好] 读取当前偏好失败，使用默认值:', readError);
    }
    
    const updatedPreferences: UserPreferences = {
      ...currentPreferences,
      ...preferences,
      updatedAt: new Date().toISOString(),
    };
    console.log(`[用户偏好] 准备写入 AsyncStorage...`);
    await AsyncStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify(updatedPreferences)
    );
    console.log(`[用户偏好] ✅ 保存完成`);
  } catch (error) {
    console.error('[用户偏好] ❌ 保存用户偏好失败:', error);
  } finally {
    isSavingPreferences = false;
  }
}

/**
 * 更新单个偏好项
 */
export async function updatePreference<K extends keyof UserPreferences>(
  key: K,
  value: UserPreferences[K]
): Promise<void> {
  try {
    const currentPreferences = await getUserPreferences();
    await saveUserPreferences({
      ...currentPreferences,
      [key]: value,
    });
  } catch (error) {
    console.error('更新偏好失败:', error);
  }
}

/**
 * 重置所有偏好为默认值
 */
export async function resetPreferences(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFERENCES_STORAGE_KEY);
  } catch (error) {
    console.error('重置偏好失败:', error);
  }
}

/**
 * 将用户偏好格式化为系统提示词（用于AI对话）
 */
export function formatPreferencesAsPrompt(preferences: UserPreferences): string {
  const parts: string[] = [];

  if (preferences.transportationPreference) {
    const transportMap: Record<string, string> = {
      economy: '经济型交通（如公共交通、经济舱）',
      comfort: '舒适型交通（如高铁、商务舱）',
      luxury: '豪华型交通（如头等舱、专车）',
      flexible: '对交通方式没有特别偏好',
    };
    parts.push(`交通偏好：${transportMap[preferences.transportationPreference] || preferences.transportationPreference}`);
  }

  if (preferences.accommodationType) {
    const accommodationMap: Record<string, string> = {
      budget: '经济型住宿（如青旅、经济酒店）',
      'mid-range': '中档住宿（如三星、四星酒店）',
      luxury: '豪华住宿（如五星酒店、度假村）',
      hostel: '青旅或民宿',
      flexible: '对住宿类型没有特别偏好',
    };
    parts.push(`住宿类型：${accommodationMap[preferences.accommodationType] || preferences.accommodationType}`);
  }

  if (preferences.travelPace) {
    const paceMap: Record<string, string> = {
      relaxed: '轻松慢节奏（每天1-2个景点，充足休息）',
      moderate: '中等节奏（每天2-3个景点，适度安排）',
      'fast-paced': '快节奏（每天多个景点，紧凑安排）',
      flexible: '对旅行节奏没有特别偏好',
    };
    parts.push(`旅行节奏：${paceMap[preferences.travelPace] || preferences.travelPace}`);
  }

  if (preferences.mbtiType) {
    parts.push(`MBTI性格类型：${preferences.mbtiType}`);
  }

  if (preferences.opennessToExperience) {
    const opennessMap: Record<string, string> = {
      'very-open': '非常开放，喜欢尝试新体验',
      moderate: '中等开放，愿意尝试但不激进',
      conservative: '相对保守，偏好熟悉的事物',
      flexible: '对新体验的态度灵活',
    };
    parts.push(`开放态度：${opennessMap[preferences.opennessToExperience] || preferences.opennessToExperience}`);
  }

  if (preferences.priceSensitivity) {
    const priceMap: Record<string, string> = {
      'very-sensitive': '价格敏感，优先考虑性价比',
      moderate: '中等价格敏感度，平衡价格和质量',
      'not-sensitive': '价格不敏感，优先考虑体验质量',
      flexible: '对价格的态度灵活',
    };
    parts.push(`价格敏感度：${priceMap[preferences.priceSensitivity] || preferences.priceSensitivity}`);
  }

  if (preferences.adventureAttitude) {
    const adventureMap: Record<string, string> = {
      'love-adventure': '热爱冒险，喜欢刺激项目',
      moderate: '中等冒险倾向，适度尝试',
      'prefer-safe': '偏好安全，避免高风险项目',
      flexible: '对冒险项目的态度灵活',
    };
    parts.push(`冒险项目态度：${adventureMap[preferences.adventureAttitude] || preferences.adventureAttitude}`);
  }

  if (parts.length === 0) {
    return '用户尚未设置旅行偏好，请根据一般旅行建议提供帮助。';
  }

  return `用户旅行偏好信息：\n${parts.join('\n')}\n\n请根据以上偏好为用户提供个性化的旅行建议和行程规划。`;
}



