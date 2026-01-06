import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

export default function InventoryAddScreen() {
  const params = useLocalSearchParams();
  const productId = params.productId as string | undefined;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Nhập hàng</ThemedText>
      <Text>Thêm nhập cho sản phẩm: {productId ?? '—'}</Text>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
});
