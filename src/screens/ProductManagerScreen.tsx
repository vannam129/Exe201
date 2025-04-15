import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import { MenuItem } from "../types";

const ProductManagerScreen = () => {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [categories, setCategories] = useState<
    { id: string | number; name: string }[]
  >([]);

  const [productForm, setProductForm] = useState({
    id: "",
    name: "",
    description: "",
    price: "",
    imageUrl: "",
    categoryId: "",
  });

  // Kiểm tra nếu không phải admin thì không cho phép truy cập
  useEffect(() => {
    if (!isAdmin()) {
      Alert.alert(
        "Không có quyền truy cập",
        "Bạn không có quyền quản lý sản phẩm."
      );
      return;
    }

    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const productsData = await api.getProducts();
      setProducts(productsData);
    } catch (error) {
      console.error("Error fetching products:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách sản phẩm.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const categoriesData = await api.getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error fetching categories:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách danh mục.");
    }
  };

  const handleAddProduct = () => {
    setIsEditing(false);
    setProductForm({
      id: "",
      name: "",
      description: "",
      price: "",
      imageUrl: "",
      categoryId: categories.length > 0 ? categories[0].id.toString() : "",
    });
    setIsModalVisible(true);
  };

  const handleEditProduct = (product: MenuItem) => {
    setIsEditing(true);
    setProductForm({
      id: product.id.toString(),
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      imageUrl: product.imageUrl || "",
      categoryId: product.categoryId ? product.categoryId.toString() : "",
    });
    setIsModalVisible(true);
  };

  const handleDeleteProduct = (product: MenuItem) => {
    Alert.alert(
      "Xác nhận xóa",
      `Bạn có chắc muốn xóa sản phẩm "${product.name}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              // Gọi API xóa sản phẩm
              await api.deleteProduct(product.id.toString());

              // Cập nhật danh sách sản phẩm
              setProducts(products.filter((p) => p.id !== product.id));
              Alert.alert("Thành công", "Đã xóa sản phẩm.");
            } catch (error) {
              console.error("Error deleting product:", error);
              Alert.alert("Lỗi", "Không thể xóa sản phẩm.");
            }
          },
        },
      ]
    );
  };

  const handleSaveProduct = async () => {
    // Kiểm tra dữ liệu nhập
    if (!productForm.name || !productForm.price || !productForm.categoryId) {
      Alert.alert(
        "Thiếu thông tin",
        "Vui lòng điền đầy đủ tên, giá và chọn danh mục."
      );
      return;
    }

    try {
      if (isEditing) {
        // Cập nhật sản phẩm
        await api.updateProduct(productForm.id, {
          name: productForm.name,
          price: parseFloat(productForm.price),
          description: productForm.description,
          imageUrl: productForm.imageUrl,
          categoryId: productForm.categoryId,
        });

        // Cập nhật danh sách hiện tại
        const updatedProducts = products.map((p) =>
          p.id.toString() === productForm.id
            ? {
                ...p,
                name: productForm.name,
                description: productForm.description,
                price: parseFloat(productForm.price),
                imageUrl: productForm.imageUrl,
                categoryId: productForm.categoryId,
              }
            : p
        );

        setProducts(updatedProducts);
        Alert.alert("Thành công", "Đã cập nhật sản phẩm.");
      } else {
        // Tạo sản phẩm mới
        const newProductData = await api.createProduct({
          name: productForm.name,
          price: parseFloat(productForm.price),
          description: productForm.description,
          imageUrl: productForm.imageUrl,
          categoryId: productForm.categoryId,
        });

        // Thêm vào danh sách hiện tại
        const categoryName =
          categories.find((c) => c.id.toString() === productForm.categoryId)
            ?.name || "";

        const newProduct: MenuItem = {
          id: newProductData.id || Date.now().toString(),
          name: productForm.name,
          description: productForm.description,
          price: parseFloat(productForm.price),
          imageUrl: productForm.imageUrl,
          category: categoryName,
          categoryId: productForm.categoryId,
        };

        setProducts([...products, newProduct]);
        Alert.alert("Thành công", "Đã thêm sản phẩm mới.");
      }

      setIsModalVisible(false);
    } catch (error) {
      console.error("Error saving product:", error);
      Alert.alert("Lỗi", "Không thể lưu sản phẩm.");
    }
  };

  const renderProductItem = ({ item }: { item: MenuItem }) => (
    <View style={styles.productItem}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>
          {item.price.toLocaleString("vi-VN", {
            style: "currency",
            currency: "VND",
          })}
        </Text>
        <Text style={styles.productCategory}>
          Danh mục: {item.category || "Chưa phân loại"}
        </Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditProduct(item)}
        >
          <Text style={styles.buttonText}>Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteProduct(item)}
        >
          <Text style={styles.buttonText}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quản lý sản phẩm</Text>

      <TouchableOpacity style={styles.addButton} onPress={handleAddProduct}>
        <Text style={styles.addButtonText}>+ Thêm sản phẩm mới</Text>
      </TouchableOpacity>

      {products.length === 0 ? (
        <Text style={styles.emptyText}>Chưa có sản phẩm nào</Text>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Modal thêm/sửa sản phẩm */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isEditing ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}
            </Text>

            <ScrollView>
              <Text style={styles.inputLabel}>Tên sản phẩm*</Text>
              <TextInput
                style={styles.input}
                value={productForm.name}
                onChangeText={(text) =>
                  setProductForm({ ...productForm, name: text })
                }
                placeholder="Nhập tên sản phẩm"
              />

              <Text style={styles.inputLabel}>Mô tả</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={productForm.description}
                onChangeText={(text) =>
                  setProductForm({ ...productForm, description: text })
                }
                placeholder="Nhập mô tả sản phẩm"
                multiline
                numberOfLines={4}
              />

              <Text style={styles.inputLabel}>Giá (VND)*</Text>
              <TextInput
                style={styles.input}
                value={productForm.price}
                onChangeText={(text) => {
                  // Chỉ cho phép nhập số
                  const numericValue = text.replace(/[^0-9]/g, "");
                  setProductForm({ ...productForm, price: numericValue });
                }}
                placeholder="Nhập giá sản phẩm"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>URL Hình ảnh</Text>
              <TextInput
                style={styles.input}
                value={productForm.imageUrl}
                onChangeText={(text) =>
                  setProductForm({ ...productForm, imageUrl: text })
                }
                placeholder="Nhập URL hình ảnh"
              />

              <Text style={styles.inputLabel}>Danh mục*</Text>
              {categories.length > 0 ? (
                <View style={styles.selectContainer}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id.toString()}
                      style={[
                        styles.categoryOption,
                        productForm.categoryId === category.id.toString() &&
                          styles.selectedCategory,
                      ]}
                      onPress={() =>
                        setProductForm({
                          ...productForm,
                          categoryId: category.id.toString(),
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          productForm.categoryId === category.id.toString() &&
                            styles.selectedCategoryText,
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.noCategories}>Không có danh mục nào</Text>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setIsModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveProduct}
                >
                  <Text style={styles.saveButtonText}>Lưu</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8f8f8",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  addButton: {
    backgroundColor: "#4CAF50",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
    color: "#666",
  },
  productItem: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 15,
    color: "#f50",
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: "#666",
  },
  actionButtons: {
    flexDirection: "column",
    justifyContent: "center",
    marginLeft: 10,
  },
  actionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    marginVertical: 4,
  },
  editButton: {
    backgroundColor: "#2196F3",
  },
  deleteButton: {
    backgroundColor: "#F44336",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
    backgroundColor: "#f9f9f9",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  selectContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  categoryOption: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 4,
  },
  selectedCategory: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  categoryOptionText: {
    color: "#333",
  },
  selectedCategoryText: {
    color: "#fff",
  },
  noCategories: {
    color: "#666",
    fontStyle: "italic",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  modalButton: {
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: "45%",
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
  },
  cancelButton: {
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  cancelButtonText: {
    color: "#333",
  },
});

export default ProductManagerScreen;
