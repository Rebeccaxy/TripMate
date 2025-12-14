import AsyncStorage from '@react-native-async-storage/async-storage';

// 用户数据类型
export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // 注意：实际应用中不应该存储明文密码，这里仅用于演示
  createdAt: string;
}

// 存储键名
const USERS_STORAGE_KEY = '@tripMate:users';
const CURRENT_USER_KEY = '@tripMate:currentUser';
const IS_LOGGED_IN_KEY = '@tripMate:isLoggedIn';

/**
 * 获取所有用户
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    const usersJson = await AsyncStorage.getItem(USERS_STORAGE_KEY);
    if (usersJson) {
      return JSON.parse(usersJson);
    }
    return [];
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return [];
  }
}

/**
 * 根据邮箱查找用户
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const users = await getAllUsers();
    return users.find(user => user.email.toLowerCase() === email.toLowerCase()) || null;
  } catch (error) {
    console.error('查找用户失败:', error);
    return null;
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

    // 检查用户是否已存在
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return {
        success: false,
        message: '该邮箱已被注册',
      };
    }

    // 创建新用户
    const newUser: User = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name,
      email: email.toLowerCase(),
      password, // 注意：实际应用中应该使用加密存储
      createdAt: new Date().toISOString(),
    };

    // 保存用户
    const users = await getAllUsers();
    users.push(newUser);
    await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    return {
      success: true,
      message: '注册成功',
      user: newUser,
    };
  } catch (error) {
    console.error('注册失败:', error);
    return {
      success: false,
      message: '注册失败，请稍后重试',
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

    // 查找用户
    const user = await getUserByEmail(email);
    if (!user) {
      return {
        success: false,
        message: '邮箱或密码错误',
      };
    }

    // 验证密码
    if (user.password !== password) {
      return {
        success: false,
        message: '邮箱或密码错误',
      };
    }

    // 保存登录状态
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    await AsyncStorage.setItem(IS_LOGGED_IN_KEY, 'true');

    return {
      success: true,
      message: '登录成功',
      user,
    };
  } catch (error) {
    console.error('登录失败:', error);
    return {
      success: false,
      message: '登录失败，请稍后重试',
    };
  }
}

/**
 * 用户登出
 */
export async function logoutUser(): Promise<void> {
  try {
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
    const userJson = await AsyncStorage.getItem(CURRENT_USER_KEY);
    if (userJson) {
      return JSON.parse(userJson);
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
    const isLoggedIn = await AsyncStorage.getItem(IS_LOGGED_IN_KEY);
    return isLoggedIn === 'true';
  } catch (error) {
    console.error('检查登录状态失败:', error);
    return false;
  }
}
