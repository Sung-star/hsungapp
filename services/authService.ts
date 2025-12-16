import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { auth } from '@/config/firebase';

// ✅ Sign Up (ĐĂNG KÝ)
export const signUp = async (
  email: string,
  password: string,
  name: string
): Promise<void> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Cập nhật tên hiển thị
    await updateProfile(userCredential.user, {
      displayName: name,
    });

    // 🔴 RẤT QUAN TRỌNG
    // Firebase tự login sau khi register → phải logout ngay
    await signOut(auth);
  } catch (error: any) {
    console.error('Error signing up:', error);
    throw new Error(error.message);
  }
};

// ✅ Sign In (ĐĂNG NHẬP)
export const signIn = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCredential.user;
  } catch (error: any) {
    console.error('Error signing in:', error);
    throw new Error(error.message);
  }
};

// ✅ Logout
export const logout = async () => {
  await signOut(auth);
};

// ✅ Get current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};
