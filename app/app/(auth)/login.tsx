import React, { useState, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { loginUser, registerUser } from '@/services/authService';

const { width, height } = Dimensions.get('window');
const SCREEN_WIDTH = width;

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Register form state
  const [name, setName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);

  // Animation value
  const slideAnim = useRef(new Animated.Value(0)).current;

  const switchMode = (newMode: 'login' | 'register') => {
    if (newMode === mode) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Animated.timing(slideAnim, {
      toValue: newMode === 'register' ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setMode(newMode);
    });
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(
        'Alert',
        'Please enter email and password'
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);

    try {
      const result = await loginUser(email, password);
      setIsLoading(false);

      if (result.success) {
        Alert.alert(
          'Success',
          'Login successful!',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(tabs)'),
            },
          ]
        );
      } else {
        Alert.alert(
          'Error',
          result.message
        );
      }
    } catch (error) {
      setIsLoading(false);
      Alert.alert(
        'Error',
        'Login failed. Please try again.'
      );
    }
  };

  const handleRegister = async () => {
    if (!name || !registerEmail || !registerPassword || !confirmPassword) {
      Alert.alert(
        'Alert',
        'Please fill in all fields'
      );
      return;
    }

    if (registerPassword !== confirmPassword) {
      Alert.alert(
        'Alert',
        'Passwords do not match'
      );
      return;
    }

    if (registerPassword.length < 6) {
      Alert.alert(
        'Alert',
        'Password must be at least 6 characters'
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRegisterLoading(true);

    try {
      const result = await registerUser(name, registerEmail, registerPassword);

      if (result.success) {
        // Auto login after successful registration
        try {
          const loginResult = await loginUser(registerEmail, registerPassword);
          setIsRegisterLoading(false);
          
          if (loginResult.success) {
            Alert.alert(
              'Success',
              'Registration successful!',
              [
                {
                  text: 'OK',
                  onPress: () => router.replace('/(tabs)'),
                },
              ]
            );
          } else {
            Alert.alert(
              'Success',
              'Registration successful! Please login.',
              [
                {
                  text: 'OK',
                  onPress: () => switchMode('login'),
                },
              ]
            );
          }
        } catch (loginError) {
          setIsRegisterLoading(false);
          Alert.alert(
            'Success',
            'Registration successful! Please login manually.',
            [
              {
                text: 'OK',
                onPress: () => switchMode('login'),
              },
            ]
          );
        }
      } else {
        setIsRegisterLoading(false);
        Alert.alert(
          'Error',
          result.message
        );
      }
    } catch (error) {
      setIsRegisterLoading(false);
      Alert.alert(
        'Error',
        'Registration failed. Please try again.'
      );
    }
  };

  const handleSocialLogin = (provider: 'google' | 'apple' | 'facebook') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Development mode: Click Apple icon to jump directly to main screen
    if (provider === 'apple') {
      router.replace('/(tabs)');
      return;
    }
    
    // TODO: Implement third-party login logic
    console.log(`${provider} ${mode}`);
  };

  // 计算整个内容区域的translateX
  const contentTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -SCREEN_WIDTH],
  });

  // Login text
  const loginTitleMain = "Let's";
  const loginTitleSub = "Travel you in.";
  const loginSubtitle = 'Discover the World with Every Sign In';
  const emailPlaceholder = 'Email or Phone Number';
  const passwordPlaceholder = 'Password';
  const forgotPasswordText = 'Forgot password?';
  const signInButton = 'Sign In';
  const orSignInWith = 'or sign in with';
  const noAccount = "I don't have a account?";
  const signUp = 'Sign Up';

  // Register text
  const registerTitleMain = "Let's";
  const registerTitleSub = "Travel you in.";
  const registerSubtitle = 'Create Your Account and Start Your Journey';
  const namePlaceholder = 'Full Name';
  const registerEmailPlaceholder = 'Email';
  const registerPasswordPlaceholder = 'Password (at least 6 characters)';
  const confirmPasswordPlaceholder = 'Confirm Password';
  const registerButton = 'Sign Up';
  const orSignUpWith = 'or sign up with';
  const hasAccount = "Already have an account?";
  const signIn = 'Sign In';

  return (
    <View style={styles.container}>
      <ImageBackground
        // 去掉文件名空格，避免加载失败
        source={require('@/assets/images/auth/sign-in-bg.png')}
        style={styles.backgroundImage}
        resizeMode="cover">
        

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}>
          <View style={styles.contentWrapper}>
            {/* 可滑动的内容容器 */}
            <Animated.View
              style={[
                styles.slidingContainer,
                {
                  transform: [{ translateX: contentTranslateX }],
                },
              ]}>
              
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
              
              {/* 登录视图 */}
              <View style={styles.viewContainer}>
                <View style={styles.cardWrapper}>
                  {/* 登录卡片 */}
                  <View style={styles.card}>
                  {/* 大标题 */}
                  <View style={styles.titleContainer}>
                    <Text style={styles.titleMain}>{loginTitleMain} </Text>
                    <Text style={styles.titleSub}>{loginTitleSub}</Text>
                  </View>
                  
                  {/* 小标题 */}
                  <Text style={styles.subtitle}>{loginSubtitle}</Text>

                  {/* 输入框 */}
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
                      autoComplete="password"
                    />
                    {/* 忘记密码链接 */}
                    <TouchableOpacity style={styles.forgotPassword}>
                      <Text style={styles.forgotPasswordText}>{forgotPasswordText}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* 登录按钮 */}
                  <TouchableOpacity
                    style={[styles.loginButton, isLoading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={isLoading}
                    activeOpacity={0.8}>
                    <Text style={styles.loginButtonText}>
                      {isLoading ? 'Signing in...' : signInButton}
                    </Text>
                  </TouchableOpacity>

                  {/* 分割线文本 */}
                  <Text style={styles.dividerText}>{orSignInWith}</Text>

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
                </View>

                {/* 底部注册区域 */}
                <View style={styles.bottomContainer}>
                  <Text style={styles.noAccountText}>{noAccount}</Text>
                  <TouchableOpacity
                    style={styles.signUpButton}
                    onPress={() => switchMode('register')}
                    activeOpacity={0.8}>
                    <Text style={styles.signUpButtonText}>{signUp}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              </ScrollView>
              
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
              
              {/* 注册视图 */}
              <View style={styles.viewContainer}>
                <View style={styles.cardWrapperRegister}>
                  {/* 注册卡片 */}
                  <View style={styles.card}>
                  {/* 大标题 */}
                  <View style={styles.titleContainer}>
                    <Text style={styles.titleMain}>{registerTitleMain} </Text>
                    <Text style={styles.titleSub}>{registerTitleSub}</Text>
                  </View>
                  
                  {/* 小标题 */}
                  <Text style={styles.subtitle}>{registerSubtitle}</Text>

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
                      placeholder={registerEmailPlaceholder}
                      placeholderTextColor="#999"
                      value={registerEmail}
                      onChangeText={setRegisterEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder={registerPasswordPlaceholder}
                      placeholderTextColor="#999"
                      value={registerPassword}
                      onChangeText={setRegisterPassword}
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
                    style={[styles.registerButton, isRegisterLoading && styles.buttonDisabled]}
                    onPress={handleRegister}
                    disabled={isRegisterLoading}
                    activeOpacity={0.8}>
                    <Text style={styles.registerButtonText}>
                      {isRegisterLoading ? 'Signing up...' : registerButton}
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
                </View>

                {/* 底部登录区域 */}
                <View style={styles.bottomContainer}>
                  <Text style={styles.hasAccountText}>{hasAccount}</Text>
                  <TouchableOpacity
                    style={styles.signInButton}
                    onPress={() => switchMode('login')}
                    activeOpacity={0.8}>
                    <Text style={styles.signInButtonText}>{signIn}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              </ScrollView>
            </Animated.View>
          </View>
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
  keyboardView: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    width: SCREEN_WIDTH,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: SCREEN_WIDTH,
  },
  slidingContainer: {
    flexDirection: 'row',
    width: SCREEN_WIDTH * 2,
    flex: 1,
  },
  viewContainer: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    overflow: 'hidden',
    flex: 1,
    position: 'relative',
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 200,
  },
  cardWrapperRegister: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 130,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
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
    position: 'relative',
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
  forgotPassword: {
    position: 'absolute',
    right: 0,
    bottom: -20,
  },
  forgotPasswordText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  loginButton: {
    height: 56,
    borderRadius: 999,
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
  registerButton: {
    height: 56,
    borderRadius: 999,
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
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
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
    borderRadius: 999,
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
    position: 'absolute',
    bottom: 60,
    left: 24,
    right: 24,
    width: 'auto',
    maxWidth: 400,
    alignSelf: 'center',
    alignItems: 'center',
  },
  noAccountText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  hasAccountText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  signUpButton: {
    width: '100%',
    height: 56,
    borderRadius: 999,
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
  signUpButtonText: {
    color: '#007A8C',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signInButton: {
    width: '100%',
    height: 56,
    borderRadius: 999,
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
