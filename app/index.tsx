import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/themed-text';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    // Redirect sau 2 giây
    const timer = setTimeout(() => {
      router.replace('/auth/login');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#f093fb']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Image
          source={require('@/assets/images/hitc.png')}
          style={styles.logo}
        />
        <ThemedText style={styles.title}>MyApp Store</ThemedText>
        <ThemedText style={styles.subtitle}>Quản lý cửa hàng thông minh</ThemedText>
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
  logo: {
    width: 200,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 20,
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
  },
});