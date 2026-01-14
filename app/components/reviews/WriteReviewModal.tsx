// components/reviews/WriteReviewModal.tsx - Fixed TypeScript errors

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import StarRating from './StarRating';
import { showAlert } from '@/utils/platformAlert';
import { uploadMultipleImages } from '@/services/uploadService';

interface WriteReviewModalProps {
  visible: boolean;
  productName: string;
  productImage?: string;
  onClose: () => void;
  onSubmit: (rating: number, comment: string, images: string[]) => Promise<void>;
}

interface LocalImage {
  uri: string;
  base64?: string | null;
}

const WriteReviewModal: React.FC<WriteReviewModalProps> = ({
  visible,
  productName,
  productImage,
  onClose,
  onSubmit,
}) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [localImages, setLocalImages] = useState<LocalImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const ratingLabels = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Tuyệt vời'];

  const pickImage = async () => {
    if (localImages.length >= 5) {
      showAlert('Thông báo', 'Chỉ được upload tối đa 5 ảnh');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Lỗi', 'Cần quyền truy cập thư viện ảnh');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.7,
        selectionLimit: 5 - localImages.length,
        base64: true,
      });

      if (!result.canceled && result.assets) {
        const newImages: LocalImage[] = result.assets.map(asset => ({
          uri: asset.uri,
          base64: asset.base64 || null,
        }));
        setLocalImages(prev => [...prev, ...newImages].slice(0, 5));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showAlert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const removeImage = (index: number) => {
    setLocalImages(prev => prev.filter((_, i) => i !== index));
  };

  // Hàm lấy URI hiển thị được trên cả Web và Mobile
  const getDisplayUri = (image: LocalImage): string => {
    if (Platform.OS === 'web' && image.base64) {
      return `data:image/jpeg;base64,${image.base64}`;
    }
    return image.uri;
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      showAlert('Lỗi', 'Vui lòng chọn số sao đánh giá');
      return;
    }
    if (!comment.trim()) {
      showAlert('Lỗi', 'Vui lòng nhập nội dung đánh giá');
      return;
    }
    if (comment.trim().length < 10) {
      showAlert('Lỗi', 'Nội dung đánh giá phải có ít nhất 10 ký tự');
      return;
    }

    setSubmitting(true);
    
    try {
      let uploadedImageUrls: string[] = [];

      if (localImages.length > 0) {
        setUploadingImages(true);
        console.log('📤 Uploading', localImages.length, 'images...');
        
        // Chuyển đổi sang format cho uploadService
        const imagesToUpload = localImages.map(img => ({
          uri: img.uri,
          base64: img.base64 || undefined,
        }));
        
        uploadedImageUrls = await uploadMultipleImages(imagesToUpload);
        
        console.log('✅ Uploaded images:', uploadedImageUrls.length);
        setUploadingImages(false);
      }

      await onSubmit(rating, comment.trim(), uploadedImageUrls);
      
      setRating(5);
      setComment('');
      setLocalImages([]);
    } catch (error) {
      console.error('Error submitting review:', error);
      showAlert('Lỗi', 'Không thể gửi đánh giá');
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setRating(5);
    setComment('');
    setLocalImages([]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Viết đánh giá</Text>
            <TouchableOpacity onPress={handleClose} disabled={submitting}>
              <Ionicons name="close" size={24} color={submitting ? '#ccc' : '#666'} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Product Info */}
            <View style={styles.productInfo}>
              {productImage ? (
                <Image source={{ uri: productImage }} style={styles.productImage} />
              ) : (
                <View style={[styles.productImage, styles.productImagePlaceholder]}>
                  <Ionicons name="cube-outline" size={30} color="#9CA3AF" />
                </View>
              )}
              <Text style={styles.productName} numberOfLines={2}>
                {productName}
              </Text>
            </View>

            {/* Rating */}
            <View style={styles.ratingSection}>
              <Text style={styles.sectionTitle}>Đánh giá của bạn</Text>
              <View style={styles.ratingContainer}>
                <StarRating
                  rating={rating}
                  size={36}
                  editable
                  onRatingChange={setRating}
                />
                <Text style={styles.ratingLabel}>{ratingLabels[rating]}</Text>
              </View>
            </View>

            {/* Comment */}
            <View style={styles.commentSection}>
              <Text style={styles.sectionTitle}>Nhận xét</Text>
              <TextInput
                style={styles.commentInput}
                value={comment}
                onChangeText={setComment}
                placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={500}
                editable={!submitting}
              />
              <Text style={styles.charCount}>{comment.length}/500</Text>
            </View>

            {/* Images */}
            <View style={styles.imagesSection}>
              <Text style={styles.sectionTitle}>Thêm hình ảnh (tối đa 5)</Text>
              <View style={styles.imagesGrid}>
                {localImages.map((image, index) => (
                  <View key={index} style={styles.imageWrapper}>
                    <Image 
                      source={{ uri: getDisplayUri(image) }} 
                      style={styles.imagePreview} 
                    />
                    {!submitting && (
                      <TouchableOpacity
                        style={styles.removeImageBtn}
                        onPress={() => removeImage(index)}
                      >
                        <Ionicons name="close-circle" size={22} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                
                {localImages.length < 5 && !submitting && (
                  <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                    <Ionicons name="camera-outline" size={28} color="#9CA3AF" />
                    <Text style={styles.addImageText}>Thêm ảnh</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <View style={styles.submittingContainer}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.submitBtnText}>
                  {uploadingImages ? 'Đang tải ảnh...' : 'Đang gửi...'}
                </Text>
              </View>
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Gửi đánh giá</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    gap: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  productImagePlaceholder: {
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  ratingSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  ratingContainer: {
    alignItems: 'center',
    gap: 8,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#F59E0B',
  },
  commentSection: {
    paddingHorizontal: 20,
  },
  commentInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1F2937',
    height: 120,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  imagesSection: {
    padding: 20,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageWrapper: {
    position: 'relative',
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 11,
  },
  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submittingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default WriteReviewModal;