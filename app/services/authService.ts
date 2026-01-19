import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '@/config/api';

// 用户数据类型
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

// API基础URL
const API_BASE_URL = API_CONFIG.BASE_URL;

// 存储键名
const TOKEN_KEY = '@tripMate:token';
const CURRENT_USER_KEY = '@tripMate:currentUser';
const IS_LOGGED_IN_KEY = '@tripMate:isLoggedIn';

/**
 * 获取存储的JWT令牌
 */
async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('获取令牌失败:', error);
    return null;
  }
}

/**
 * 保存JWT令牌
 */
async function saveToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('保存令牌失败:', error);
  }
}

/**
 * 清除JWT令牌
 */
async function clearToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('清除令牌失败:', error);
  }
}

/**
 * 注册新用户
 */
export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<{ success: boolean; message: string; user?: User }> {
  try {
    // 验证输入
    if (!name || !email || !password) {
      return {
        success: false,
        message: '请填写所有字段',
      };
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        message: '邮箱格式不正确',
      };
    }

    // 验证密码长度
    if (password.length < 6) {
      return {
        success: false,
        message: '密码长度至少为6位',
      };
    }

    // 调用后端API
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    });

    const data = await response.json();

    if (data.success && data.user && data.token) {
      // 保存令牌和用户信息
      await saveToken(data.token);
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
      await AsyncStorage.setItem(IS_LOGGED_IN_KEY, 'true');

      return {
        success: true,
        message: data.message || '注册成功',
        user: data.user,
      };
    } else {
      return {
        success: false,
        message: data.message || '注册失败，请稍后重试',
      };
    }
  } catch (error) {
    console.error('注册失败:', error);
    return {
      success: false,
      message: '网络错误，请检查服务器连接',
    };
  }
}

/**
 * 用户登录
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; message: string; user?: User }> {
  try {
    // 验证输入
    if (!email || !password) {
      return {
        success: false,
        message: '请输入邮箱和密码',
      };
    }

    // 调用后端API
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (data.success && data.user && data.token) {
      // 保存令牌和用户信息
      await saveToken(data.token);
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
      await AsyncStorage.setItem(IS_LOGGED_IN_KEY, 'true');

      return {
        success: true,
        message: data.message || '登录成功',
        user: data.user,
      };
    } else {
      return {
        success: false,
        message: data.message || '登录失败，请稍后重试',
      };
    }
  } catch (error) {
    console.error('登录失败:', error);
    return {
      success: false,
      message: '网络错误，请检查服务器连接',
    };
  }
}

/**
 * 用户登出
 */
export async function logoutUser(): Promise<void> {
  try {
    await clearToken();
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
    await AsyncStorage.setItem(IS_LOGGED_IN_KEY, 'false');
  } catch (error) {
    console.error('登出失败:', error);
  }
}

/**
 * 获取当前登录用户
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const token = await getToken();
    if (!token) {
      return null;
    }

    // 尝试从本地存储获取
    const userJson = await AsyncStorage.getItem(CURRENT_USER_KEY);
    if (userJson) {
      return JSON.parse(userJson);
    }

    // 如果本地没有，尝试从服务器获取
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success && data.user) {
        await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
        return data.user;
      }
    } catch (apiError) {
      console.error('从服务器获取用户失败:', apiError);
    }

    return null;
  } catch (error) {
    console.error('获取当前用户失败:', error);
    return null;
  }
}

/**
 * 检查是否已登录
 */
export async function isLoggedIn(): Promise<boolean> {
  try {
    const token = await getToken();
    if (!token) {
      return false;
    }

    const isLoggedInFlag = await AsyncStorage.getItem(IS_LOGGED_IN_KEY);
    return isLoggedInFlag === 'true' && !!token;
  } catch (error) {
    console.error('检查登录状态失败:', error);
    return false;
  }
}






