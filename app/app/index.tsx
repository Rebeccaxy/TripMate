import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, View, Text } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    console.log('🚀 [Splash] 启动页面加载');
    
    try {
      // 启动了动画
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        console.log('✅ [Splash] 动画完成');
      });

      // 动画结束后直接跳转到引导页
      const timer = setTimeout(() => {
        console.log('🔄 [Splash] 准备跳转到引导页');
        try {
          router.replace('/onboarding');
          console.log('✅ [Splash] 跳转成功');
        } catch (error) {
          console.error('❌ [Splash] 跳转失败:', error);
        }
      }, 3000); // 3秒后跳转

      return () => {
        clearTimeout(timer);
        console.log('🧹 [Splash] 清理定时器');
      };
    } catch (error) {
      console.error('❌ [Splash] 启动失败:', error);
    }
  }, [router, fadeAnim, scaleAnim, slideAnim]);

  return (
    <View style={[styles.container, { backgroundColor: '#007A8C' }]}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim },
            ],
          },
        ]}>
        <Image
          source={require('@/assets/images/Logo.png')}
          style={styles.logo}
          contentFit="contain"
          onError={(error) => {
            console.error('❌ [Splash] Logo 图片加载失败:', error);
          }}
          onLoad={() => {
            console.log('✅ [Splash] Logo 图片加载成功');
          }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: '70%', // 中上位置
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 250,
    height: 200,
    // 根据你的logo实际尺寸调整 width 和 height1
  },
});

