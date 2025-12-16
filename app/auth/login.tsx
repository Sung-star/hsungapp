import { useState } from 'react';
import { TextInput, TouchableOpacity, View, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { authStyles, gradientColors } from '@/styles/auth-styles';
import { signIn } from '@/services/authService';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      return Alert.alert('Lỗi', 'Vui lòng nhập email và mật khẩu');
    }

    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Đăng nhập thất bại', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={gradientColors.background}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={authStyles.gradient}
    >
      <ThemedView style={authStyles.container}>
        <View style={authStyles.card}>

          <View style={authStyles.logoContainer}>
            <Image source={require('@/assets/images/hitc.png')} style={authStyles.logo} />
          </View>

          <ThemedText type="title" style={authStyles.title}>Chào mừng trở lại!</ThemedText>

          {/* Email */}
          <View style={authStyles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#999" style={authStyles.inputIcon} />
            <TextInput
              style={authStyles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
          </View>

          {/* Password */}
          <View style={authStyles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#999" style={authStyles.inputIcon} />
            <TextInput
              style={authStyles.input}
              placeholder="Mật khẩu"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={authStyles.eyeIcon}>
              <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity onPress={handleLogin} disabled={loading}>
            <LinearGradient
              colors={gradientColors.loginButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={authStyles.button}
            >
              <ThemedText style={authStyles.buttonText}>
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </ThemedText>
            </LinearGradient>
          </TouchableOpacity>

          {/* Bottom */}
          <View style={authStyles.bottomText}>
            <ThemedText style={authStyles.bottomTextGray}>Chưa có tài khoản?</ThemedText>
            <Link href="/auth/register">
              <ThemedText style={authStyles.linkText}> Đăng ký ngay</ThemedText>
            </Link>
          </View>

        </View>
      </ThemedView>
    </LinearGradient>
  );
}
