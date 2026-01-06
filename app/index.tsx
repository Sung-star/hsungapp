// app/index.tsx - AUTO REDIRECT TO LOGIN
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    // ✅ Redirect sau 1 giây
    const timer = setTimeout(() => {
      console.log('🚀 Redirecting to login...');
      router.replace('/auth/login');
    }, 1000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <LinearGradient
      colors={['#2ecc71', '#27ae60', '#16a085']}
      style={styles.container}
    >
      <View style={styles.content}>
        <ThemedText style={styles.title}>Siêu Thị Mini</ThemedText>
        <ThemedText style={styles.subtitle}>
          Mua sắm tiện lợi - Giá cả phải chăng
        </ThemedText>
        <ActivityIndicator size="large" color="white" style={{ marginTop: 20 }} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});