import { Slot, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';
import React, { useState, useEffect } from 'react';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setCheckingAuth(false);
    });

    return unsubscribe;
  }, []);

 useEffect(() => {
  if (checkingAuth) return;

  const segment = segments[0];
  const inAuthGroup = segment === '(auth)';

  if (!user) {
    router.replace('/(auth)/login');
    return;
  }

  if (user && inAuthGroup) {
    router.replace('/(tabs)');
  }
}, [user, checkingAuth]);

  if (checkingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}
