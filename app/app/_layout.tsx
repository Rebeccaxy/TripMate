import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
    console.error('❌ [全局错误捕获]', error);
    console.error('   错误名称:', error.name);
    console.error('   错误消息:', error.message);
    console.error('   是否致命:', isFatal);
    console.error('   错误堆栈:', error.stack?.substring(0, 500));
    // 记录错误
    if (defaultHandler) {
      defaultHandler(error, isFatal);
    }
  });
}

// 捕获未处理的Promise rejection（React Native环境）
if (typeof global !== 'undefined') {
  const hermesInternal = (global as any).HermesInternal;
  if (hermesInternal?.enablePromiseRejectionTracker) {
    hermesInternal.enablePromiseRejectionTracker({
      allRejections: true,
    });
  }
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // 在开发模式下捕获所有错误
  useEffect(() => {
    console.log('✅ [RootLayout] 根布局组件已加载');
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
              // 注意：Expo Router 的 Stack 可能不支持 cardStyleInterpolator
              // 如果需要自定义动画，可能需要使用其他方式
            }} 
          />
        <Stack.Screen
          name="chat/[id]"
          options={{
            headerShown: false,
            header: () => null,
            presentation: 'card',
            navigationBarHidden: true,
            // 注意：Expo Router 的 Stack 可能不支持 cardStyleInterpolator 和 transitionSpec
            // 如果需要自定义动画，可能需要使用其他方式或库
          }}
        />
        <Stack.Screen
          name="chat/new"
          options={{
            headerShown: false,
            presentation: 'card',
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
        <Stack.Screen
          name="note/list"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="note/editor"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="post/editor"
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
