import { Tabs } from 'expo-router';
import React from 'react';
import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const isDark = colorScheme === 'dark';
  const tabBarBackgroundColor = isDark
    ? 'rgba(15, 23, 42, 0.92)'
    : 'rgba(255, 255, 255, 0.96)';
  const tabBarBorderColor = isDark
    ? 'rgba(148, 163, 184, 0.5)'
    : 'rgba(148, 163, 184, 0.2)';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: tabBarBackgroundColor,
            borderColor: tabBarBorderColor,
            paddingBottom: insets.bottom || 10,
            height: 60 + (insets.bottom || 10),
          },
        ],
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        tabBarHideOnKeyboard: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => {
            return (
              <Image
                key={focused ? 'home-selected' : 'home-unselected'}
                source={
                  focused
                    ? require('@/assets/images/tabs/Home_light_select.png')
                    : require('@/assets/images/tabs/Home_light.png')
                }
                style={{ width: 24, height: 24 }}
                contentFit="contain"
              />
            );
          },
        }}
      />
      <Tabs.Screen
        name="tripchat"
        options={{
          title: 'TripChat',
          tabBarIcon: ({ focused }) => (
            <Image
              key={focused ? 'tripchat-selected' : 'tripchat-unselected'}
              source={
                focused
                  ? require('@/assets/images/tabs/Chat_alt_3_light_select.png')
                  : require('@/assets/images/tabs/Chat_alt_3_light.png')
              }
              style={{ width: 24, height: 24 }}
              contentFit="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="traces"
        options={{
          title: 'Traces',
          tabBarIcon: ({ focused }) => (
            <Image
              key={focused ? 'traces-selected' : 'traces-unselected'}
              source={
                focused
                  ? require('@/assets/images/tabs/Pin_alt_light_select.png')
                  : require('@/assets/images/tabs/Pin_alt_light.png')
              }
              style={{ width: 24, height: 24 }}
              contentFit="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ focused }) => (
            <Image
              key={focused ? 'account-selected' : 'account-unselected'}
              source={
                focused
                  ? require('@/assets/images/tabs/User_alt_light_select.png')
                  : require('@/assets/images/tabs/User_alt_light.png')
              }
              style={{ width: 24, height: 24 }}
              contentFit="contain"
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: 6,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  tabBarLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  tabBarItem: {
    paddingVertical: 0,
  },
});
