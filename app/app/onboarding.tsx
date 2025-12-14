import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Dimensions, Text, ImageBackground } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const [language, setLanguage] = useState<'English' | '中文'>('English');

  const handleGetStarted = () => {
    // 触觉反馈
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // 跳转到登录页
    router.replace('/(auth)/login');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'English' ? '中文' : 'English');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const titleText = language === 'English' 
    ? 'Ready to explore beyond boundaries?'
    : '准备好探索无限边界了吗？';
  
  const buttonText = language === 'English'
    ? 'Your Journey Starts Here'
    : '你的旅程从这里开始';

  return (
    <View style={styles.container}>
      {/* 背景图片 */}
      <ImageBackground
        source={require('@/assets/images/onboarding/Get Started-BG.png')}
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

        {/* Logo - 在底部卡片正上方，距离顶部30% */}
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/Logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </View>

        {/* 底部卡片容器 */}
        <View style={styles.bottomCard}>
          {/* 标题 */}
          <Text style={styles.title}>{titleText}</Text>
          
          {/* 按钮 */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleGetStarted}
            activeOpacity={0.8}>
            <Text style={styles.buttonText}>{buttonText}</Text>
            <Image
              source={require('@/assets/images/onboarding/flight.png')}
              style={styles.buttonLogo}
              contentFit="contain"
            />
          </TouchableOpacity>
        </View>
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
    // 移除背景和圆角
  },
  languageText: {
    fontSize: 14,
    color: '#FFFFFF', // 改为白色
    fontWeight: '500',
  },
  languageArrow: {
    fontSize: 10,
    color: '#FFFFFF', // 改为白色
  },
  logoContainer: {
    position: 'absolute',
    top: height * 0.25, // 距离顶部30%
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1, // 确保在背景图片之上
  },
  logo: {
    width: 200,
    height: 200,
    // 根据你的logo实际尺寸调整 width 和 height
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.3, // 占屏幕30%高度
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 50, // 减小底部内边距，让按钮往上移动
    justifyContent: 'flex-start', // 改为 flex-start，让 marginBottom 生效
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -8, // 向上偏移，让阴影更明显
    },
    shadowOpacity: 0.3, // 增加阴影透明度，让阴影更明显
    shadowRadius: 20, // 增加阴影模糊半径，让阴影更柔和
    elevation: 15, // Android 阴影层级
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#007A8C',
    textAlign: 'center',
    lineHeight: 36,
    marginTop: 10, // 标题往下移动的距离
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007A8C',
    height: 56,
    borderRadius: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 8,
    marginTop: 'auto', // 让按钮自动推到底部
    shadowColor: '#007A8C',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  buttonLogo: {
    width: 20,
    height: 20,
  },
});
