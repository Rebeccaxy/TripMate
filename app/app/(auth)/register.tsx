import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ImageBackground,
  Text,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { registerUser, loginUser } from '@/services/authService';

const { width, height } = Dimensions.get('window');

export default function RegisterScreen() {
  const router = useRouter();
  const [language, setLanguage] = useState<'English' | '中文'>('English');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const toggleLanguage = () => {
    setLanguage(language === 'English' ? '中文' : 'English');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert(
        language === 'English' ? 'Alert' : '提示',
        language === 'English' ? 'Please fill in all fields' : '请填写所有字段'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        language === 'English' ? 'Alert' : '提示',
        language === 'English' ? 'Passwords do not match' : '两次输入的密码不一致'
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        language === 'English' ? 'Alert' : '提示',
        language === 'English' ? 'Password must be at least 6 characters' : '密码长度至少为6位'
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);

    try {
      const result = await registerUser(name, email, password);

      if (result.success) {
        // 注册成功后自动登录
        try {
          const loginResult = await loginUser(email, password);
          setIsLoading(false);
          
          if (loginResult.success) {
            Alert.alert(
              language === 'English' ? 'Success' : '成功',
              language === 'English' ? 'Registration successful!' : '注册成功！',
              [
                {
                  text: language === 'English' ? 'OK' : '确定',
                  onPress: () => router.replace('/(tabs)'),
                },
              ]
            );
          } else {
            Alert.alert(
              language === 'English' ? 'Success' : '成功',
              language === 'English' ? 'Registration successful! Please login.' : '注册成功！请登录。',
              [
                {
                  text: language === 'English' ? 'OK' : '确定',
                  onPress: () => router.back(),
                },
              ]
            );
          }
        } catch (loginError) {
          setIsLoading(false);
          Alert.alert(
            language === 'English' ? 'Success' : '成功',
            language === 'English' ? 'Registration successful! Please login manually.' : '注册成功！请手动登录。',
            [
              {
                text: language === 'English' ? 'OK' : '确定',
                onPress: () => router.back(),
              },
            ]
          );
        }
      } else {
        setIsLoading(false);
        Alert.alert(
          language === 'English' ? 'Error' : '错误',
          result.message
        );
      }
    } catch (error) {
      setIsLoading(false);
      Alert.alert(
        language === 'English' ? 'Error' : '错误',
        language === 'English' ? 'Registration failed. Please try again.' : '注册失败，请稍后重试。'
      );
    }
  };

  const handleBackToLogin = () => {
    router.back();
  };

  const handleSocialLogin = (provider: 'google' | 'apple' | 'facebook') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: 实现第三方登录逻辑
    console.log(`${provider} register`);
  };

  // 多语言文本
  const titleMain = language === 'English' ? "Let's" : "让我们";
  const titleSub = language === 'English' ? "Travel you in." : "开始您的旅程。";
  const subtitle = language === 'English'
    ? 'Create Your Account and Start Your Journey'
    : '创建您的账号，开启您的旅程';
  const namePlaceholder = language === 'English' ? 'Full Name' : '姓名';
  const emailPlaceholder = language === 'English' ? 'Email' : '邮箱';
  const passwordPlaceholder = language === 'English' ? 'Password (at least 6 characters)' : '密码（至少6位）';
  const confirmPasswordPlaceholder = language === 'English' ? 'Confirm Password' : '确认密码';
  const registerButton = language === 'English' ? 'Sign Up' : '注册';
  const orSignUpWith = language === 'English' ? 'or sign up with' : '或使用以下方式注册';
  const hasAccount = language === 'English' ? "Already have an account?" : '已有账号？';
  const signIn = language === 'English' ? 'Sign In' : '登录';

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('@/assets/images/auth/Sign In-BG.png')}
        style={styles.backgroundImage}
        resizeMode="cover">
        
        {/* 右上角语言选择器 */}
        <TouchableOpacity
          style={styles.languageSelector}
          onPress={toggleLanguage}
          activeOpacity={0.7}>
          <Text style={styles.languageText}>{language}</Text>
          <Text style={styles.languageArrow}>▼</Text>
        </TouchableOpacity>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            
            {/* 居中的注册卡片 */}
            <View style={styles.card}>
              {/* 大标题 */}
              <View style={styles.titleContainer}>
                <Text style={styles.titleMain}>{titleMain} </Text>
                <Text style={styles.titleSub}>{titleSub}</Text>
              </View>
              
              {/* 小标题 */}
              <Text style={styles.subtitle}>{subtitle}</Text>

              {/* 输入框 */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder={namePlaceholder}
                  placeholderTextColor="#999"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder={emailPlaceholder}
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder={passwordPlaceholder}
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder={confirmPasswordPlaceholder}
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                />
              </View>

              {/* 注册按钮 */}
              <TouchableOpacity
                style={[styles.registerButton, isLoading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
                activeOpacity={0.8}>
                <Text style={styles.registerButtonText}>
                  {isLoading ? (language === 'English' ? 'Signing up...' : '注册中...') : registerButton}
                </Text>
              </TouchableOpacity>

              {/* 分割线文本 */}
              <Text style={styles.dividerText}>{orSignUpWith}</Text>

              {/* 第三方登录按钮 */}
              <View style={styles.socialButtonsContainer}>
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => handleSocialLogin('google')}
                  activeOpacity={0.8}>
                  <Image
                    source={require('@/assets/images/auth/flat-color-icons_google.png')}
                    style={styles.socialIcon}
                    contentFit="contain"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => handleSocialLogin('apple')}
                  activeOpacity={0.8}>
                  <Image
                    source={require('@/assets/images/auth/ic_baseline-apple.png')}
                    style={styles.socialIcon}
                    contentFit="contain"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => handleSocialLogin('facebook')}
                  activeOpacity={0.8}>
                  <Image
                    source={require('@/assets/images/auth/logos_facebook.png')}
                    style={styles.socialIcon}
                    contentFit="contain"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* 底部登录区域 */}
            <View style={styles.bottomContainer}>
              <Text style={styles.hasAccountText}>{hasAccount}</Text>
              <TouchableOpacity
                style={styles.signInButton}
                onPress={handleBackToLogin}
                activeOpacity={0.8}>
                <Text style={styles.signInButtonText}>{signIn}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  languageSelector: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 10,
  },
  languageText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  languageArrow: {
    fontSize: 10,
    color: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  titleMain: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
  },
  titleSub: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007A8C',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#000000',
  },
  registerButton: {
    height: 56,
    borderRadius: 999, // 完全圆角
    backgroundColor: '#007A8C',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#007A8C',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dividerText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 12,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 0,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 999, // 完全圆角
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  socialIcon: {
    width: 24,
    height: 24,
  },
  bottomContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    marginTop: 24,
  },
  hasAccountText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  signInButton: {
    width: '100%',
    height: 56,
    borderRadius: 999, // 完全圆角
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  signInButtonText: {
    color: '#007A8C',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
