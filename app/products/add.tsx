import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// 🔥 IMPORT FIREBASE HÀM RIÊNG CỦA BẠN ↓
import { addProduct, updateProduct, uploadProductImage } from '@/firebase/productService';

export default function AddProductScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [loading, setLoading] = useState(false);

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

  // Pick image
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

  // SAVE PRODUCT
const handleSave = async () => {
  if (!name.trim()) {
    Alert.alert('Lỗi', 'Vui lòng nhập tên sản phẩm');
    return;
  }

  setLoading(true);

  try {
    // 1️⃣ Tạo product trước
    const productId = await addProduct({
      name,
      description,
      category,
        categoryId: '',
      sku: sku || `SKU-${Date.now()}`,
      price: Number(price),
      costPrice: Number(costPrice) || 0,
      stock: Number(stock),
      imageUrl: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2️⃣ Upload ảnh SAU
    if (imageUri && (imageUri.startsWith('file://') || imageUri.startsWith('blob:'))) {
      const imageUrl = await uploadProductImage(imageUri, productId);
      await updateProduct(productId, { imageUrl });
    }

    Alert.alert('Thành công', 'Đã thêm sản phẩm', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  } catch (e) {
    console.log(e);
    Alert.alert('Lỗi', 'Không thể thêm sản phẩm');
  } finally {
    setLoading(false);
  }
};



  return (
    <View style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thêm sản phẩm</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* IMAGE UPLOAD */}
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

        {/* FORM */}
        <View style={styles.form}>
          {/* NAME */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Tên sản phẩm <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập tên sản phẩm"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* DESCRIPTION */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mô tả</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Nhập mô tả sản phẩm"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* CATEGORY */}
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

          {/* SKU */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mã SKU</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập mã SKU"
              placeholderTextColor="#999"
              value={sku}
              onChangeText={setSku}
            />
          </View>

          {/* PRICE + COST PRICE */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>
                Giá bán <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Giá nhập</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={costPrice}
                onChangeText={setCostPrice}
              />
            </View>
          </View>

          {/* STOCK */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Số lượng tồn kho <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={stock}
              onChangeText={setStock}
            />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* SAVE BUTTON */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <LinearGradient colors={['#43A047', '#66BB6A']} style={styles.saveGradient}>
            <Text style={styles.saveText}>
              {loading ? 'Đang lưu...' : 'Lưu sản phẩm'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: 'white' },
  content: { flex: 1, paddingHorizontal: 20 },
  imageUpload: { marginTop: 20, marginBottom: 24, alignSelf: 'center' },
  uploadPlaceholder: {
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'white',
    borderWidth: 2, borderColor: '#e0e0e0', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
  },
  uploadText: { marginTop: 8, fontSize: 14, color: '#999' },
  uploadedImage: { width: 150, height: 150, borderRadius: 75 },
  form: { gap: 20 },
  inputGroup: { marginBottom: 4 },
  label: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  required: { color: '#FF6B6B' },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryChipActive: { backgroundColor: '#667eea', borderColor: '#667eea' },
  categoryText: { fontSize: 14, color: '#666' },
  categoryTextActive: { color: 'white', fontWeight: '600' },
  row: { flexDirection: 'row' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, backgroundColor: 'white',
    borderTopWidth: 1, borderTopColor: '#e0e0e0',
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveGradient: { paddingVertical: 16, alignItems: 'center' },
  saveText: { fontSize: 17, fontWeight: '700', color: 'white' },
});
