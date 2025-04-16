import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigators/AppNavigator";
import api from "../services/api";
import { MenuItem, Category } from "../types";
import { useAuth } from "../contexts/AuthContext";

type ProductDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  "ProductDetails"
>;
type ProductDetailScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ProductDetails"
>;

interface ProductDetailScreenProps {
  route: ProductDetailScreenRouteProp;
  navigation: ProductDetailScreenNavigationProp;
}

const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { productId } = route.params;
  const [product, setProduct] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryName, setCategoryName] = useState<string>("Chưa phân loại");
  const { isAuthenticated, user, getUserId, isAdmin } = useAuth();

  useEffect(() => {
    const fetchProductDetail = async () => {
      try {
        setLoading(true);
        console.log(
          "ProductDetailScreen: Fetching product with ID:",
          productId
        );

        // Lấy dữ liệu danh mục
        const categoriesData = await api.getCategories();
        setCategories(categoriesData);

        // Lấy dữ liệu sản phẩm
        const productData = await api.getProductById(productId);
        console.log(
          "ProductDetailScreen: Received product data:",
          JSON.stringify(productData, null, 2)
        );

        setProduct(productData);

        // Nếu sản phẩm có categoryId, tìm tên danh mục tương ứng
        if (
          productData &&
          productData.categoryId !== undefined &&
          productData.categoryId !== null
        ) {
          const category = categoriesData.find(
            (c) => c.id.toString() === productData.categoryId!.toString()
          );
          if (category) {
            setCategoryName(category.name);
          }
        }
      } catch (error) {
        console.error("Lỗi khi tải chi tiết sản phẩm:", error);
        console.error("Chi tiết lỗi:", JSON.stringify(error));
        Alert.alert("Lỗi", "Không thể tải thông tin sản phẩm.");
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetail();
  }, [productId]);

  const addToCart = async () => {
    if (!product) return;

    if (!isAuthenticated || !user) {
      Alert.alert(
        "Yêu cầu đăng nhập",
        "Vui lòng đăng nhập để thêm món vào giỏ hàng",
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Đăng nhập",
            onPress: () => navigation.navigate("Login"),
          },
        ]
      );
      return;
    }

    try {
      setAddingToCart(true);
      const userId = await getUserId();
      await api.addToCart(userId, product.id.toString(), 1);
      Alert.alert("Thành công", `Đã thêm ${product.name} vào giỏ hàng`, [
        { text: "Tiếp tục mua sắm", style: "cancel" },
        {
          text: "Xem giỏ hàng",
          onPress: () => navigation.navigate("Cart"),
        },
      ]);
    } catch (error) {
      console.error("Lỗi khi thêm vào giỏ hàng:", error);
      Alert.alert(
        "Lỗi",
        "Không thể thêm món vào giỏ hàng. Vui lòng thử lại sau."
      );
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f50" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Không tìm thấy thông tin sản phẩm</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Hình ảnh sản phẩm */}
      <Image
        source={{ uri: product.imageUrl || "https://via.placeholder.com/400" }}
        style={styles.productImage}
        resizeMode="cover"
      />

      {/* Thông tin sản phẩm */}
      <View style={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productPrice}>
            {product.price.toLocaleString("vi-VN", {
              style: "currency",
              currency: "VND",
            })}
          </Text>
        </View>

        {/* Danh mục */}
        <View style={styles.categoryContainer}>
          <Text style={styles.categoryLabel}>Danh mục:</Text>
          <Text style={styles.categoryValue}>{categoryName}</Text>
        </View>

        {/* Mô tả */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionTitle}>Mô tả sản phẩm</Text>
          <Text style={styles.descriptionText}>
            {product.description || "Không có mô tả cho sản phẩm này."}
          </Text>
        </View>

        {/* Nút thêm vào giỏ hàng */}
        {!isAdmin() && (
          <TouchableOpacity
            style={styles.addToCartButton}
            onPress={addToCart}
            disabled={addingToCart}
          >
            {addingToCart ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.addToCartButtonText}>Thêm vào giỏ hàng</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#f50",
    borderRadius: 25,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  productImage: {
    width: "100%",
    height: 300,
  },
  contentContainer: {
    padding: 20,
  },
  headerContainer: {
    marginBottom: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#f50",
  },
  categoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryLabel: {
    fontSize: 16,
    color: "#666",
    marginRight: 5,
  },
  categoryValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  descriptionContainer: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#555",
  },
  addToCartButton: {
    backgroundColor: "#f50",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  addToCartButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default ProductDetailScreen;
