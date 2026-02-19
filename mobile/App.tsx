import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import GhostFeedScreen from './src/screens/GhostFeedScreen';
import ExecutionMonitorScreen from './src/screens/ExecutionMonitorScreen';
import ApprovalQueueScreen from './src/screens/ApprovalQueueScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { colors } from './src/theme';

const Tab = createBottomTabNavigator();

const GhostTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.accent,
    background: colors.bgPrimary,
    card: colors.bgSecondary,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.accent,
  },
};

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Feed: '✨',
    Executions: '▶️',
    Approvals: '✅',
    Settings: '⚙️',
  };
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 20 }}>{icons[label] || '📱'}</Text>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer theme={GhostTheme}>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.bgSecondary,
            borderTopColor: colors.border,
            paddingTop: 6,
            height: 85,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
          },
        })}
      >
        <Tab.Screen name="Feed" component={GhostFeedScreen} />
        <Tab.Screen name="Executions" component={ExecutionMonitorScreen} />
        <Tab.Screen name="Approvals" component={ApprovalQueueScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
