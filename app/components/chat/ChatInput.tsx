// components/chat/ChatInput.tsx - Chat Input Component (FIXED)

import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { showAlert } from '@/utils/platformAlert';

interface ChatInputProps {
  onSend: (content: string, type?: 'text' | 'image', imageUrl?: string) => Promise<boolean>;
  onImageUpload?: (uri: string, base64?: string) => Promise<string | null>;
  disabled?: boolean;
  placeholder?: string;
  onFocus?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onImageUpload,
  disabled = false,
  placeholder = 'Nhập tin nhắn...',
  onFocus, // ✅ FIX: Thêm destructure onFocus ở đây
}) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || sending || disabled) return;

    setSending(true);
    const success = await onSend(message.trim(), 'text');
    if (success) {
      setMessage('');
    }
    setSending(false);
  };

  const handlePickImage = async () => {
    if (disabled || !onImageUpload) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Lỗi', 'Cần quyền truy cập thư viện ảnh');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        const asset = result.assets[0];
        const uploadedUrl = await onImageUpload(asset.uri, asset.base64 || undefined);
        
        if (uploadedUrl) {
          await onSend('', 'image', uploadedUrl);
        } else {
          showAlert('Lỗi', 'Không thể tải ảnh lên');
        }
        setUploading(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Image Button */}
      {onImageUpload && (
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handlePickImage}
          disabled={disabled || uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#667eea" />
          ) : (
            <Ionicons name="image-outline" size={24} color="#667eea" />
          )}
        </TouchableOpacity>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={1000}
          editable={!disabled && !sending}
          onSubmitEditing={handleSend}
          onFocus={onFocus} // ✅ Giờ đã có onFocus
        />
      </View>

      {/* Send Button */}
      <TouchableOpacity
        style={[
          styles.sendButton,
          (!message.trim() || sending || disabled) && styles.sendButtonDisabled,
        ]}
        onPress={handleSend}
        disabled={!message.trim() || sending || disabled}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="send" size={20} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
  },
  input: {
    fontSize: 16,
    color: '#1F2937',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
});

export default ChatInput;