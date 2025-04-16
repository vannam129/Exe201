import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  RefreshControl,
  ScrollView,
} from "react-native";
import { Button } from "react-native-elements";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import api from "../services/api";
import { MenuItem, Category } from "../types";
import { RootStackParamList } from "../navigators/AppNavigator";
import { useAuth } from "../contexts/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

// Define the API response format
interface ApiResponse {
  $id: string;
  isSuccess: boolean;
  message: string | null;
  data: {
    $id: string;
    $values: ProductApiItem[];
  };
}

interface ProductApiItem {
  $id: string;
  productId: string;
  productName: string;
  price: number;
  description: string;
  status: boolean;
  imageURL: string;
  categoryId: string;
  category?: string;
}

interface CategoryApiResponse {
  $id: string;
  isSuccess: boolean;
  message: string | null;
  data: {
    $id: string;
    $values: CategoryApiItem[];
  };
}

interface CategoryApiItem {
  $id: string;
  categoryId: string;
  categoryName: string;
  status: boolean;
}

const HomeScreen = () => {
  const [popularItems, setPopularItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user, isAuthenticated, getUserId } = useAuth();

  const fetchData = async () => {
    try {
      // Fetch products from /api/Product
      const products = await api.getProducts();
      console.log("Phản hồi sản phẩm:", products);

      // Lấy 5 sản phẩm đầu tiên làm Popular Items
      if (products && products.length > 0) {
        setPopularItems(products.slice(0, 5));
        console.log(
          "Sản phẩm phổ biến từ API:",
          products
            .slice(0, 5)
            .map((p) => p.name)
            .join(", ")
        );
      }

      // Fetch categories
      const categories = await api.getCategories();
      console.log(
        "HomeScreen nhận được danh mục:",
        categories.map((c) => `${c.name} (${c.id})`).join(", ")
      );

      if (categories && categories.length > 0) {
        setCategories(categories);
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  // Hàm decode base64 vì atob không có sẵn trong React Native
  const decodeBase64 = (str: string): string => {
    const base64chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    let output = "";
    str = String(str).replace(/=+$/, "");

    if (str.length % 4 === 1) {
      throw new Error("Chuỗi base64 không hợp lệ");
    }

    for (
      let bc = 0, bs = 0, buffer, i = 0;
      (buffer = str.charAt(i++));
      ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
        ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
        : 0
    ) {
      buffer = base64chars.indexOf(buffer);
    }

    return output;
  };

  const addToCart = async (item: MenuItem) => {
    // Kiểm tra xem người dùng đã đăng nhập chưa
    if (!isAuthenticated || !user) {
      Alert.alert(
        "Đăng nhập",
        "Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng",
        [
          { text: "Hủy", style: "cancel" },
          { text: "Đăng nhập", onPress: () => navigation.navigate("Login") },
        ]
      );
      return;
    }

    try {
      setAddingToCart(true);

      // Lấy userId từ AuthContext
      let userId = "";
      try {
        userId = await getUserId();
        console.log("Sử dụng userId từ AuthContext getUserId:", userId);
      } catch (error) {
        console.error("Lỗi khi lấy userId từ AuthContext:", error);

        // Fallback: Lấy từ user object
        if (user && user.id) {
          userId = user.id.toString();
          console.log("Sử dụng userId từ user object fallback:", userId);
        }

        // Nếu vẫn không có, thử lấy từ AsyncStorage
        if (!userId) {
          try {
            const userData = await AsyncStorage.getItem("user_data");
            if (userData) {
              const parsedUser = JSON.parse(userData);
              if (parsedUser && parsedUser.id) {
                userId = parsedUser.id.toString();
                console.log("Sử dụng userId từ AsyncStorage fallback:", userId);
              }
            }
          } catch (storageError) {
            console.error(
              "Lỗi khi lấy dữ liệu người dùng từ AsyncStorage:",
              storageError
            );
          }
        }
      }

      // Kiểm tra userId hợp lệ
      if (!userId) {
        Alert.alert(
          "Lỗi",
          "Không thể lấy thông tin người dùng. Vui lòng đăng nhập lại."
        );
        navigation.navigate("Login");
        return;
      }

      // Lấy productId từ sản phẩm được chọn
      const productId = item.id.toString();
      console.log("Sử dụng productId từ sản phẩm đã chọn:", productId);

      console.log("Dữ liệu giỏ hàng cuối cùng:", {
        userId,
        productId,
        quantity: 1,
      });

      // Gọi API
      const result = await api.addToCart(userId, productId, 1);
      console.log("Kết quả thêm vào giỏ hàng:", result);

      Alert.alert("Thành công", `Đã thêm ${item.name} vào giỏ hàng`, [
        { text: "Tiếp tục mua sắm", style: "cancel" },
        { text: "Xem giỏ hàng", onPress: () => navigation.navigate("Cart") },
      ]);
    } catch (error: any) {
      console.error("Lỗi khi thêm vào giỏ hàng:", error);
      let errorMessage = "Không thể thêm vào giỏ hàng";

      if (error.message) {
        errorMessage = error.message;
      } else if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        errorMessage = error.response.data.message;
      }

      Alert.alert("Lỗi", errorMessage);
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

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Chào mừng quay trở lại!</Text>
          <Text style={styles.title}>Balama App</Text>
        </View>
      </View>

      {/* Categories Section */}
      <View style={styles.categoriesSection}>
        <Text style={styles.sectionTitle}>Danh mục</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScrollView}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id.toString()}
              style={styles.categoryCard}
              onPress={() =>
                navigation.navigate("Menu", {
                  category: category.name,
                  categoryId: category.id,
                })
              }
            >
              <View style={styles.categoryIcon}>
                <Text style={styles.categoryEmoji}>
                  {getCategoryEmoji(category.name)}
                </Text>
              </View>
              <Text style={styles.categoryName}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Popular Items Section */}
      <View style={styles.popularSection}>
        <Text style={styles.sectionTitle}>Món ăn phổ biến</Text>
        <FlatList
          data={popularItems}
          renderItem={({ item }) => (
            <View style={styles.foodCard}>
              <Image
                source={{
                  uri: item.imageUrl || "https://via.placeholder.com/150",
                }}
                style={styles.foodImage}
              />
              <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{item.name}</Text>
                <Text style={styles.foodDescription} numberOfLines={2}>
                  {item.description || "Không có mô tả"}
                </Text>
                <View style={styles.foodPriceRow}>
                  <Text style={styles.foodPrice}>
                    {item.price.toLocaleString("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    })}
                  </Text>
                  <TouchableOpacity
                    style={styles.addToCartButton}
                    onPress={() => addToCart(item)}
                    disabled={addingToCart}
                  >
                    {addingToCart ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.addToCartText}>+</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.popularItemsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      </View>
    </View>
  );
};

// Hàm helper để lấy emoji cho từng category
const getCategoryEmoji = (categoryName: string): string => {
  const emojiMap: { [key: string]: string } = {
    Drinks: "🥤",
    Foods: "🍱",
    Desserts: "🍰",
    Snacks: "🍿",
    // Thêm các category khác nếu cần
  };
  return emojiMap[categoryName] || "🍽️";
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
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: "#fff",
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  welcomeText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  categoriesSection: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  categoriesScrollView: {
    paddingHorizontal: 15,
  },
  categoryCard: {
    alignItems: "center",
    marginHorizontal: 5,
    width: 100,
  },
  categoryIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 8,
  },
  categoryEmoji: {
    fontSize: 30,
  },
  categoryName: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
  },
  popularSection: {
    flex: 1,
    paddingTop: 10,
  },
  popularItemsList: {
    padding: 20,
  },
  foodCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: "hidden",
  },
  foodImage: {
    width: 100,
    height: 100,
  },
  foodInfo: {
    flex: 1,
    padding: 15,
  },
  foodName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  foodDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 10,
  },
  foodPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  foodPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#f50",
  },
  addToCartButton: {
    backgroundColor: "#f50",
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: "center",
    alignItems: "center",
  },
  addToCartText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
});

export default HomeScreen;
