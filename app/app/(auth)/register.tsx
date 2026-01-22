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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert(
        'Alert',
        'Please fill in all fields'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        'Alert',
        'Passwords do not match'
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        'Alert',
        'Password must be at least 6 characters'
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);

    try {
      const result = await registerUser(name, email, password);

      if (result.success) {
        // Auto login after successful registration
        try {
          const loginResult = await loginUser(email, password);
          setIsLoading(false);
          
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
                  onPress: () => router.back(),
                },
              ]
            );
          }
        } catch (loginError) {
          setIsLoading(false);
          Alert.alert(
            'Success',
            'Registration successful! Please login manually.',
            [
              {
                text: 'OK',
                onPress: () => router.back(),
              },
            ]
          );
        }
      } else {
        setIsLoading(false);
        Alert.alert(
          'Error',
          result.message
        );
      }
    } catch (error) {
      setIsLoading(false);
      Alert.alert(
        'Error',
        'Registration failed. Please try again.'
      );
    }
  };

  const handleBackToLogin = () => {
    router.back();
  };

  const handleSocialLogin = (provider: 'google' | 'apple' | 'facebook') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Development mode: Click Apple icon to jump directly to main screen
    if (provider === 'apple') {
      router.replace('/(tabs)');
      return;
    }
    
    // TODO: Implement third-party login logic
    console.log(`${provider} register`);
  };

  // Text
  const titleMain = "Let's";
  const titleSub = "Travel you in.";
  const subtitle = 'Create Your Account and Start Your Journey';
  const namePlaceholder = 'Full Name';
  const emailPlaceholder = 'Email';
  const passwordPlaceholder = 'Password (at least 6 characters)';
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
                  {isLoading ? 'Signing up...' : registerButton}
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
