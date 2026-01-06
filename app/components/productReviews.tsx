import { auth } from '@/config/firebase';
import { ProductReview, addProductReview, onProductReviews } from '@/firebase/reviewService';
import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Props {
  productId: string;
}

export default function ProductReviews({ productId }: Props) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [text, setText] = useState('');
  const [rating, setRating] = useState('5');

  useEffect(() => {
    const unsub = onProductReviews(productId, setReviews);
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [productId]);

  const submit = async () => {
    if (!text.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập nội dung đánh giá');
    const r: Omit<ProductReview, 'id'> = {
      rating: Number(rating),
      text: text.trim(),
      createdAt: new Date().toISOString(),
      userId: auth.currentUser?.uid ?? 'guest',
    };
    try {
      await addProductReview(productId, r);
      setText('');
      setRating('5');
      Alert.alert('Cảm ơn', 'Đã gửi đánh giá');
    } catch (e) {
      console.error(e);
      Alert.alert('Lỗi', 'Không thể gửi đánh giá');
    }
  };

  const renderItem = ({ item }: { item: ProductReview }) => (
    <View style={styles.card}>
      <Text style={styles.rating}>⭐ {item.rating}</Text>
      <Text style={styles.text}>{item.text}</Text>
      <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đánh giá</Text>
      <View style={styles.form}>
        <TextInput value={text} onChangeText={setText} placeholder="Viết đánh giá..." style={styles.input} multiline />
        <View style={styles.row}>
          <TextInput value={rating} onChangeText={setRating} keyboardType="numeric" style={styles.smallInput} />
          <TouchableOpacity style={styles.btn} onPress={submit}><Text style={styles.btnText}>Gửi</Text></TouchableOpacity>
        </View>
      </View>

      <FlatList data={reviews} renderItem={renderItem} keyExtractor={(i) => i.id ?? Math.random().toString()} contentContainerStyle={{ padding: 12 }} ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#666' }}>Chưa có đánh giá nào</Text>} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f8f9fa' },
  title: { fontSize: 18, fontWeight: '700', margin: 12 },
  form: { paddingHorizontal: 12, backgroundColor: 'white' },
  input: { minHeight: 60, borderColor: '#eee', borderWidth: 1, borderRadius: 8, padding: 8, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  smallInput: { width: 64, borderColor: '#eee', borderWidth: 1, borderRadius: 8, padding: 8, marginRight: 8 },
  btn: { backgroundColor: '#43A047', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  btnText: { color: 'white', fontWeight: '700' },
  card: { backgroundColor: 'white', padding: 12, borderRadius: 10, marginBottom: 10 },
  rating: { fontWeight: '700' },
  text: { marginTop: 6 },
  time: { marginTop: 8, fontSize: 12, color: '#999' },
});
