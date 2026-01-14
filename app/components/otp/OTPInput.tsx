// components/otp/OTPInput.tsx - Beautiful 6-digit OTP Input

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Animated,
  Keyboard,
  Platform,
} from 'react-native';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}

const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value,
  onChange,
  disabled = false,
  error = false,
  autoFocus = true,
}) => {
  const inputRefs = useRef<TextInput[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimations = useRef(
    Array.from({ length }, () => new Animated.Value(1))
  ).current;

  // Shake animation khi có lỗi
  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: -10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [error]);

  // Auto focus vào ô đầu tiên
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [autoFocus]);

  const handleChange = (text: string, index: number) => {
    // Chỉ cho phép số
    const cleanText = text.replace(/[^0-9]/g, '');

    if (cleanText.length > 1) {
      // Handle paste - điền nhiều số cùng lúc
      const newValue = value.split('');
      const pastedChars = cleanText.split('');
      
      pastedChars.forEach((char, i) => {
        if (index + i < length) {
          newValue[index + i] = char;
        }
      });

      onChange(newValue.join(''));

      // Focus vào ô cuối cùng được điền hoặc ô tiếp theo
      const lastFilledIndex = Math.min(index + pastedChars.length - 1, length - 1);
      const nextIndex = Math.min(lastFilledIndex + 1, length - 1);
      
      if (index + pastedChars.length >= length) {
        Keyboard.dismiss();
      } else {
        inputRefs.current[nextIndex]?.focus();
      }
    } else {
      // Handle single character input
      const newValue = value.split('');
      newValue[index] = cleanText;
      onChange(newValue.join(''));

      // Scale animation
      Animated.sequence([
        Animated.timing(scaleAnimations[index], {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimations[index], {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto focus next input
      if (cleanText && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      // Dismiss keyboard khi đã điền hết
      if (cleanText && index === length - 1) {
        Keyboard.dismiss();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!value[index] && index > 0) {
        // Nếu ô hiện tại trống, focus về ô trước
        const newValue = value.split('');
        newValue[index - 1] = '';
        onChange(newValue.join(''));
        inputRefs.current[index - 1]?.focus();
      } else {
        // Xóa ô hiện tại
        const newValue = value.split('');
        newValue[index] = '';
        onChange(newValue.join(''));
      }
    }
  };

  const handleFocus = (index: number) => {
    setFocusedIndex(index);
  };

  const handleBlur = () => {
    setFocusedIndex(null);
  };

  const getInputStyle = (index: number) => {
    const isFilled = !!value[index];
    const isFocused = focusedIndex === index;

    return [
      styles.input,
      isFilled && styles.inputFilled,
      isFocused && styles.inputFocused,
      error && styles.inputError,
      disabled && styles.inputDisabled,
    ];
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateX: shakeAnimation }] },
      ]}
    >
      {Array.from({ length }).map((_, index) => (
        <Animated.View
          key={index}
          style={[
            styles.inputWrapper,
            { transform: [{ scale: scaleAnimations[index] }] },
          ]}
        >
          <TextInput
            ref={(ref) => {
              if (ref) inputRefs.current[index] = ref;
            }}
            style={getInputStyle(index)}
            value={value[index] || ''}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            onFocus={() => handleFocus(index)}
            onBlur={handleBlur}
            keyboardType="number-pad"
            maxLength={6} // Cho phép paste
            editable={!disabled}
            selectTextOnFocus
            caretHidden={Platform.OS === 'ios'}
          />
        </Animated.View>
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  inputWrapper: {
    width: 48,
    height: 56,
  },
  input: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  inputFilled: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  inputFocused: {
    borderColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
    color: '#9CA3AF',
  },
});

export default OTPInput;
