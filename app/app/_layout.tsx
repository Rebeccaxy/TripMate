import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CardStyleInterpolators } from '@react-navigation/stack';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

// 全局错误处理 - 防止未捕获的错误导致崩溃
if (typeof ErrorUtils !== 'undefined') {
  const defaultHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    console.error('全局错误捕获:', error, 'isFatal:', isFatal);
    // 记录错误
    if (defaultHandler) {
      defaultHandler(error, isFatal);
    }
  });
}

// 捕获未处理的Promise rejection（React Native环境）
if (typeof global !== 'undefined' && global.HermesInternal) {
  // Hermes引擎环境
  const originalPromiseRejectionTracker = (global as any).HermesInternal?.enablePromiseRejectionTracker;
  if (originalPromiseRejectionTracker) {
    (global as any).HermesInternal.enablePromiseRejectionTracker({
      allRejections: true,
    });
  }
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // 在开发模式下捕获所有错误
  useEffect(() => {
    if (__DEV__) {
      const originalConsoleError = console.error;
      console.error = (...args: any[]) => {
        originalConsoleError.apply(console, args);
        // 在开发模式下，我们可以在这里添加额外的错误处理
      };
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            navigationBarHidden: true,
          }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen 
            name="(tabs)" 
            options={{ 
              headerShown: false,
              cardStyleInterpolator: ({ current, layouts }) => {
                // 当从聊天页面返回时，列表页从下方滑入
                return {
                  cardStyle: {
                    transform: [
                      {
                        translateY: current.progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [layouts.screen.height, 0],
                        }),
                      },
                    ],
                  },
                };
              },
            }} 
          />
        <Stack.Screen
          name="chat/[id]"
          options={{
            headerShown: false,
            header: () => null,
            presentation: 'card',
            tabBarStyle: { display: 'none' },
            navigationBarHidden: true,
            cardStyleInterpolator: ({ current, next, layouts }) => {
              // 判断是否是返回操作（next存在且progress小于current）
              const isGoingBack = next && next.progress < current.progress;
              
              if (isGoingBack) {
                // 返回时：当前屏幕向右滑出
                return {
                  cardStyle: {
                    transform: [
                      {
                        translateX: current.progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, layouts.screen.width],
                        }),
                      },
                    ],
                  },
                  overlayStyle: {
                    opacity: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 0],
                    }),
                  },
                };
              } else {
                // 前进时：从右侧滑入
                return {
                  cardStyle: {
                    transform: [
                      {
                        translateX: current.progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [layouts.screen.width, 0],
                        }),
                      },
                    ],
                  },
                  overlayStyle: {
                    opacity: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.5],
                    }),
                  },
                };
              }
            },
            gestureDirection: 'horizontal',
            gestureEnabled: true,
            transitionSpec: {
              open: {
                animation: 'timing',
                config: {
                  duration: 300,
                },
              },
              close: {
                animation: 'timing',
                config: {
                  duration: 300,
                },
              },
            },
          }}
        />
        <Stack.Screen
          name="chat/new"
          options={{
            headerShown: false,
            presentation: 'card',
            tabBarStyle: { display: 'none' },
            navigationBarHidden: true,
          }}
        />
        <Stack.Screen
          name="search"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
