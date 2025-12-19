import { Tabs } from 'expo-router';
import React from 'react';
import { Image } from 'expo-image';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
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
