import { Stack } from 'expo-router';

import { AuthGuard, AuthProvider } from '@/src/state/auth/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthGuard>
    </AuthProvider>
  );
}
