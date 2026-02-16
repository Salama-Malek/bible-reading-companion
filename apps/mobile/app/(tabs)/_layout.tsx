import { Tabs } from 'expo-router';

import { AuthRequired } from '@/src/state/auth/AuthContext';

export default function TabLayout() {
  return (
    <AuthRequired>
      <Tabs>
        <Tabs.Screen name="home" options={{ title: 'Home' }} />
        <Tabs.Screen name="history" options={{ title: 'History' }} />
        <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
      </Tabs>
    </AuthRequired>
  );
}
