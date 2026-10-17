import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from './icon';
import { useTheme } from '../theme';

const ICONS: Record<string, [IconName, string]> = {
  index: ['home', 'Inicio'], tickets: ['list', 'Tickets'], remote: ['terminal', 'Remoto'], live: ['pulse', 'En vivo'], profile: ['user', 'Perfil'],
};

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', backgroundColor: c.tabBar, borderTopWidth: 1, borderColor: c.line, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 10) + 4, paddingHorizontal: 8 }}>
      {state.routes.map((route, i) => {
        const opts = descriptors[route.key].options as { href?: string | null };
        if (opts.href === null) return null;
        const meta = ICONS[route.name]; if (!meta) return null;
        const focused = state.index === i;
        const color = focused ? c.accent : c.muted;
        return (
          <Pressable key={route.key} accessibilityRole="button" accessibilityLabel={meta[1]} accessibilityState={{ selected: focused }}
            onPress={() => { const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!focused && !e.defaultPrevented) navigation.navigate(route.name as never); }}
            style={{ alignItems: 'center', gap: 4, minWidth: 62, paddingVertical: 2 }}>
            <View style={{ width: 46, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? c.accentSoft : 'transparent' }}>
              <Icon name={meta[0]} size={21} color={color} />
            </View>
            <Text style={{ color, fontSize: 11, fontWeight: focused ? '800' : '700' }}>{meta[1]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
