import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';

import { PlannerProvider } from '@/store/planner-store';
import { CardTransitionProvider } from '@/components/card-transition-provider';
import { useTheme } from '@/hooks/use-theme';

// Expo Router error boundary – prevents full crashes, shows recovery UI
export { ErrorBoundary } from 'expo-router';

// Expo Go can briefly open the app with an empty `--/` path after a reload.
// Keep the planner's root screen as the explicit navigation fallback.
export const unstable_settings = {
  initialRouteName: 'index',
};

function LayoutContent() {
  const { colors, isDark } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <CardTransitionProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerTransparent: true,
            headerBackground: () => (
              <View style={StyleSheet.absoluteFill}>
                <BlurView
                  tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
                  intensity={80}
                  style={StyleSheet.absoluteFill}
                />
                <View
                  style={{
                    ...StyleSheet.absoluteFillObject,
                    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.45)' : 'rgba(255, 255, 255, 0.40)',
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                  }}
                />
              </View>
            ),
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerTitleStyle: {
              fontWeight: '600',
              fontSize: 17,
            },
            headerBackButtonDisplayMode: 'minimal',
            headerBackTitle: ' ',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false, headerBackTitle: ' ' }} />
          <Stack.Screen name="day/[date]" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="task/new" options={{ title: 'Жаңа тапсырма', presentation: 'modal' }} />
          <Stack.Screen name="task/[id]" options={{ title: 'Тапсырманы өңдеу', presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ headerShown: true, title: 'Баптаулар', headerBackButtonDisplayMode: 'minimal', headerBackTitle: ' ' }} />
          <Stack.Screen name="appearance" options={{ headerShown: true, title: 'Сыртқы түрі', headerBackButtonDisplayMode: 'minimal', headerBackTitle: ' ' }} />
          <Stack.Screen name="integrations" options={{ headerShown: true, title: 'Интеграция', headerBackButtonDisplayMode: 'minimal', headerBackTitle: ' ' }} />
        </Stack>
      </CardTransitionProvider>
    </View>
  );
}

export default function Layout() {
  return (
    <PlannerProvider>
      <LayoutContent />
    </PlannerProvider>
  );
}
