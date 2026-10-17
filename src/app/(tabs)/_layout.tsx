import { Tabs } from 'expo-router/js-tabs';
import { useAuth } from '../../auth';
import { TabBar } from '../../components/tab-bar';

export default function TabsLayout() {
  const { me, isAdmin, canRemote } = useAuth();
  return (
    <Tabs tabBar={props => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="tickets" />
      <Tabs.Screen name="remote" options={{ href: me && canRemote ? undefined : null }} />
      <Tabs.Screen name="live" options={{ href: me && isAdmin ? undefined : null }} />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
