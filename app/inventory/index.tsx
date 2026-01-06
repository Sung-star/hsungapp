import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StyleSheet, Text } from 'react-native';

export default function InventoryScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Nhập hàng</ThemedText>
      <Text>Danh sách phiếu nhập sẽ hiển thị ở đây.</Text>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
});
