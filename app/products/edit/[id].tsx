import {
  getProductById,
  updateProduct,
  uploadProductImage,
} from '@/firebase/productService';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

/* ================= UTIL ================= */
const isLocalImage = (uri: string) =>
  uri.startsWith('file://') || uri.startsWith('blob:');

const isRemoteImage = (uri: string) =>
  uri.startsWith('http://') || uri.startsWith('https://');

/* ================= SCREEN ================= */
export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [loading, setLoading] = useState(true);

  const categories = [
    'Nước giải khát',
    'Mì ăn liền',
    'Bánh kẹo',
    'Sữa',
    'Bia rượu',
    'Đồ ăn vặt',
    'Gia vị',
    'Vệ sinh',
  ];

  /* ========== LOAD PRODUCT ========== */
  useEffect(() => {
    const loadProduct = async () => {
      const product = await getProductById(id);
      if (!product) return;

      setName(product.name ?? '');
      setDescription(product.description ?? '');
      setCategory(product.category ?? '');
      setSku(product.sku ?? '');
      setPrice(product.price?.toString() ?? '0');
      setCostPrice(product.costPrice?.toString() ?? '0');
      setStock(product.stock?.toString() ?? '0');
      setImageUri(product.imageUrl ?? '');

      setLoading(false);
    };

    loadProduct();
  }, [id]);

  /* ========== PICK IMAGE ========== */
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  /* ========== UPDATE PRODUCT ========== */
  const handleUpdate = async () => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên sản phẩm');
      return;
    }

    setLoading(true);

    try {
      let finalImageUrl = imageUri;

      // 🔥 Upload nếu là ảnh local
      if (imageUri && isLocalImage(imageUri)) {
        finalImageUrl = await uploadProductImage(imageUri, id);
      }

      // 🔗 Nếu là URL thì giữ nguyên
      if (imageUri && isRemoteImage(imageUri)) {
        finalImageUrl = imageUri;
      }

      await updateProduct(id, {
        name,
        description,
        category,
        sku,
        price: Number(price),
        costPrice: Number(costPrice) || 0,
        stock: Number(stock),
        imageUrl: finalImageUrl,
        updatedAt: new Date(),
      });

      Alert.alert('Thành công', 'Đã cập nhật sản phẩm', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/products') },
      ]);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể cập nhật sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  /* ========== LOADING ========== */
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  /* ========== UI ========== */
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chỉnh sửa sản phẩm</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* IMAGE */}
        <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.uploadedImage} />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Ionicons name="camera-outline" size={40} color="#999" />
              <Text style={styles.uploadText}>Thêm ảnh sản phẩm</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* IMAGE URL INPUT */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>URL ảnh (tuỳ chọn)</Text>
          <TextInput
            style={styles.input}
            placeholder="https://example.com/image.jpg"
            placeholderTextColor="#999"
            value={imageUri}
            onChangeText={setImageUri}
            autoCapitalize="none"
          />
        </View>

        {/* FORM */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tên sản phẩm *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mô tả</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Danh mục</Text>
            <View style={styles.categoryContainer}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    category === cat && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      category === cat && styles.categoryTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              placeholder="Giá bán"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
            <TextInput
              style={[styles.input, { flex: 1, marginLeft: 8 }]}
              placeholder="Giá nhập"
              keyboardType="numeric"
              value={costPrice}
              onChangeText={setCostPrice}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Số lượng tồn"
            keyboardType="numeric"
            value={stock}
            onChangeText={setStock}
          />
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleUpdate}>
          <LinearGradient colors={['#667eea', '#764ba2']} style={styles.saveGradient}>
            <Text style={styles.saveText}>Cập nhật sản phẩm</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 50, paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: 'white' },
  content: { flex: 1, paddingHorizontal: 20 },
  imageUpload: { marginTop: 20, marginBottom: 16, alignSelf: 'center' },
  uploadPlaceholder: { width: 150, height: 150, borderRadius: 75, backgroundColor: '#fff', borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  uploadText: { marginTop: 8, color: '#999' },
  uploadedImage: { width: 150, height: 150, borderRadius: 75 },
  form: { gap: 16 },
  inputGroup: { marginBottom: 8 },
  label: { fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e0e0e0' },
  textArea: { height: 100 },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  categoryChipActive: { backgroundColor: '#667eea', borderColor: '#667eea' },
  categoryTextActive: { color: 'white' },
  row: { flexDirection: 'row' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'white' },
  saveButton: { borderRadius: 12, overflow: 'hidden' },
  saveGradient: { paddingVertical: 16, alignItems: 'center' },
  saveText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
