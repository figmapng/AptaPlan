import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { PlannerProvider } from '@/store/planner-store';
import { CardTransitionProvider } from '@/components/card-transition-provider';
import { useTheme } from '@/hooks/use-theme';

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
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.background },
            contentStyle: { backgroundColor: colors.background },
            headerBackTitle: 'Артқа',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="day/[date]" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="task/new" options={{ title: 'Жаңа тапсырма', presentation: 'modal' }} />
          <Stack.Screen name="task/[id]" options={{ title: 'Тапсырманы өңдеу', presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="appearance" options={{ headerShown: false }} />
          <Stack.Screen name="integrations" options={{ headerShown: false }} />
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
