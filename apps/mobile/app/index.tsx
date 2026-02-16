import { Redirect } from 'expo-router';

import { useAuth } from '@/src/state/auth/useAuth';

export default function Index() {
  const { user } = useAuth();

  if (user) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/auth/login" />;
}
