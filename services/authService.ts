// auth.service.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

// ✅ SIGN UP - Lưu role vào Firestore
export const signUp = async (
  email: string,
  password: string,
  name: string,
  role: 'admin' | 'client' = 'client'
): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: name });

    // ✅ Lưu user info + role vào Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: name,
      role: role,
      createdAt: new Date().toISOString(),
    });

    console.log('✅ User created with role:', role);
    return user;
  } catch (error: any) {
    console.error('❌ Error signing up:', error);
    throw new Error(error.message);
  }
};

// ✅ SIGN IN
export const signIn = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    console.error('❌ Error signing in:', error);
    throw new Error(error.message);
  }
};

// ✅ SIGN OUT
export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('❌ Error signing out:', error);
    throw new Error(error.message);
  }
};

// ✅ GET USER ROLE
export const getUserRole = async (uid: string): Promise<string> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data().role || 'client';
    }
    return 'client';
  } catch (error) {
    console.error('❌ Error getting user role:', error);
    return 'client';
  }
};

// ✅ UPDATE USER PROFILE
export const updateUserProfile = async (data: {
  displayName?: string;
  photoURL?: string;
}): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    await updateProfile(currentUser, data);
    console.log('✅ Profile updated:', data);
  } catch (error: any) {
    console.error('❌ Error updating profile:', error);
    throw new Error(error.message);
  }
};

// ✅ GET CURRENT USER
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};