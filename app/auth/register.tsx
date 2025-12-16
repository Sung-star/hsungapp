import { useState } from 'react';
import { TextInput, TouchableOpacity, View, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { authStyles, gradientColors } from '@/styles/auth-styles';
import { signUp } from '@/services/authService';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập họ tên');
    if (!email.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập email');
    if (password.length < 6)
      return Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
    if (password !== confirm)
      return Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');

    setLoading(true);
    try {
      await signUp(email, password, name);

      Alert.alert(
        'Thành công',
        'Đăng ký tài khoản thành công. Vui lòng đăng nhập.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/auth/login'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Đăng ký thất bại', error.message);
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
      <ScrollView contentContainerStyle={authStyles.scrollContainer}>
        <ThemedView style={authStyles.container}>
          <View style={authStyles.card}>

            <View style={authStyles.logoContainer}>
              <Image
                source={require('@/assets/images/hitc.png')}
                style={authStyles.logoSmall}
              />
            </View>

            <ThemedText type="title" style={authStyles.title}>
              Tạo tài khoản mới
            </ThemedText>

            {/* Name */}
            <View style={authStyles.inputContainerSmall}>
              <Ionicons name="person-outline" size={20} color="#999" style={authStyles.inputIcon} />
              <TextInput
                style={authStyles.input}
                placeholder="Họ và tên"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Email */}
            <View style={authStyles.inputContainerSmall}>
              <Ionicons name="mail-outline" size={20} color="#999" style={authStyles.inputIcon} />
              <TextInput
                style={authStyles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Password */}
            <View style={authStyles.inputContainerSmall}>
              <Ionicons name="lock-closed-outline" size={20} color="#999" style={authStyles.inputIcon} />
              <TextInput
                style={authStyles.input}
                placeholder="Mật khẩu"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={authStyles.eyeIcon}>
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#999" />
              </TouchableOpacity>
            </View>

            {/* Confirm */}
            <View style={authStyles.inputContainerSmall}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#999" style={authStyles.inputIcon} />
              <TextInput
                style={authStyles.input}
                placeholder="Xác nhận mật khẩu"
                secureTextEntry={!showConfirm}
                value={confirm}
                onChangeText={setConfirm}
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={authStyles.eyeIcon}>
                <Ionicons name={showConfirm ? 'eye-outline' : 'eye-off-outline'} size={20} color="#999" />
              </TouchableOpacity>
            </View>

            {/* Register Button */}
            <TouchableOpacity onPress={handleRegister} disabled={loading}>
              <LinearGradient
                colors={gradientColors.registerButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={authStyles.button}
              >
                <ThemedText style={authStyles.buttonText}>
                  {loading ? 'Đang đăng ký...' : 'Đăng ký'}
                </ThemedText>
              </LinearGradient>
            </TouchableOpacity>

            {/* Bottom */}
            <View style={authStyles.bottomTextSmall}>
              <ThemedText style={authStyles.bottomTextGray}>Đã có tài khoản?</ThemedText>
              <Link href="/auth/login">
                <ThemedText style={authStyles.linkText}> Đăng nhập</ThemedText>
              </Link>
            </View>

          </View>
        </ThemedView>
      </ScrollView>
    </LinearGradient>
  );
}
