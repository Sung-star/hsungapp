// services/uploadService.ts - Fixed types

import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '@/config/firebase';
import { Platform } from 'react-native';

interface ImageData {
  uri: string;
  base64?: string;
}

/**
 * Upload một ảnh lên Firebase Storage
 */
export const uploadImage = async (
  imageData: ImageData | string,
  folder: string = 'reviews'
): Promise<string | null> => {
  try {
    const filename = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const storageRef = ref(storage, filename);

    // Nếu là string (uri cũ), convert thành object
    const data: ImageData = typeof imageData === 'string' 
      ? { uri: imageData } 
      : imageData;

    if (Platform.OS === 'web' && data.base64) {
      // Trên Web: Sử dụng base64
      await uploadString(storageRef, data.base64, 'base64', {
        contentType: 'image/jpeg',
      });
    } else {
      // Trên Mobile hoặc không có base64: Fetch uri và upload blob
      const response = await fetch(data.uri);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob);
    }

    const downloadURL = await getDownloadURL(storageRef);
    console.log('✅ Image uploaded:', downloadURL);

    return downloadURL;
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    return null;
  }
};

/**
 * Upload nhiều ảnh
 */
export const uploadMultipleImages = async (
  images: (ImageData | string)[],
  folder: string = 'reviews'
): Promise<string[]> => {
  const uploadedUrls: string[] = [];

  for (const image of images) {
    const url = await uploadImage(image, folder);
    if (url) {
      uploadedUrls.push(url);
    }
  }

  return uploadedUrls;
};