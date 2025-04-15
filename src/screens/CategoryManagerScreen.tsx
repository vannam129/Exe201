import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import { Ionicons } from "@expo/vector-icons";
import { Category } from "../types";

const CategoryManagerScreen = () => {
  const { isAdmin } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");

  useEffect(() => {
    if (!isAdmin()) {
      Alert.alert(
        "Không có quyền truy cập",
        "Bạn không có quyền quản lý danh mục."
      );
      return;
    }

    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await api.getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách danh mục.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = () => {
    setIsEditing(false);
    setSelectedCategory(null);
    setCategoryName("");
    setCategoryDescription("");
    setModalVisible(true);
  };

  const handleEditCategory = (category: Category) => {
    setIsEditing(true);
    setSelectedCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || "");
    setModalVisible(true);
  };

  const handleDeleteCategory = (category: Category) => {
    Alert.alert(
      "Xác nhận xóa",
      `Bạn có chắc muốn xóa danh mục "${category.name}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              // Gọi API xóa danh mục
              // await api.deleteCategory(category.id);

              // Cập nhật danh sách danh mục
              setCategories(categories.filter((c) => c.id !== category.id));
              Alert.alert("Thành công", "Đã xóa danh mục.");
            } catch (error) {
              console.error("Error deleting category:", error);
              Alert.alert("Lỗi", "Không thể xóa danh mục.");
            }
          },
        },
      ]
    );
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên danh mục.");
      return;
    }

    try {
      if (isEditing && selectedCategory) {
        // Cập nhật danh mục
        // const updatedCategory = await api.updateCategory({
        //   id: selectedCategory.id,
        //   name: categoryName,
        //   description: categoryDescription,
        // });

        // Cập nhật danh sách danh mục
        const updatedCategories = categories.map((c) =>
          c.id === selectedCategory.id
            ? { ...c, name: categoryName, description: categoryDescription }
            : c
        );
        setCategories(updatedCategories);
        Alert.alert("Thành công", "Đã cập nhật danh mục.");
      } else {
        // Thêm danh mục mới
        // const newCategory = await api.createCategory({
        //   name: categoryName,
        //   description: categoryDescription,
        // });

        // Thêm vào danh sách hiện tại (giả lập)
        const newCategory: Category = {
          id: Date.now().toString(),
          name: categoryName,
          description: categoryDescription,
        };
        setCategories([...categories, newCategory]);
        Alert.alert("Thành công", "Đã thêm danh mục mới.");
      }

      setModalVisible(false);
    } catch (error) {
      console.error("Error saving category:", error);
      Alert.alert("Lỗi", "Không thể lưu danh mục.");
    }
  };

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <View style={styles.categoryItem}>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.categoryDescription}>{item.description}</Text>
        )}
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditCategory(item)}
        >
          <Ionicons name="pencil" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteCategory(item)}
        >
          <Ionicons name="trash" size={18} color="#fff" />
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
      <Text style={styles.title}>Quản lý danh mục</Text>

      <TouchableOpacity style={styles.addButton} onPress={handleAddCategory}>
        <Text style={styles.addButtonText}>+ Thêm danh mục mới</Text>
      </TouchableOpacity>

      {categories.length === 0 ? (
        <Text style={styles.emptyText}>Chưa có danh mục nào</Text>
      ) : (
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Modal thêm/sửa danh mục */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isEditing ? "Cập nhật danh mục" : "Thêm danh mục mới"}
            </Text>

            <Text style={styles.inputLabel}>Tên danh mục*</Text>
            <TextInput
              style={styles.input}
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder="Nhập tên danh mục"
            />

            <Text style={styles.inputLabel}>Mô tả</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={categoryDescription}
              onChangeText={setCategoryDescription}
              placeholder="Nhập mô tả danh mục"
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveCategory}
              >
                <Text style={styles.saveButtonText}>Lưu</Text>
              </TouchableOpacity>
            </View>
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
  categoryItem: {
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
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: "#666",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: "#2196F3",
  },
  deleteButton: {
    backgroundColor: "#F44336",
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

export default CategoryManagerScreen;
