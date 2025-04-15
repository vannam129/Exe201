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
interface ProductApiResponse {
  $id: string;
  $values: ProductApiItem[];
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
      const productsResponse = await api.getProducts();
      console.log("API response:", productsResponse);

      let products: MenuItem[] = [];

      // Check if response is in the new format with $id and $values
      if (
        productsResponse &&
        typeof productsResponse === "object" &&
        "$id" in productsResponse &&
        "$values" in productsResponse
      ) {
        // Type assertion to treat the response as the ProductApiResponse
        const typedResponse = productsResponse as unknown as ProductApiResponse;

        // Map the new format to our MenuItem format
        products = typedResponse.$values.map((item: ProductApiItem) => ({
          id: item.productId,
          name: item.productName,
          description: item.description,
          price: item.price,
          imageUrl: item.imageURL,
          categoryId: item.categoryId,
          category: "", // Adding the required category field with an empty string as default
        }));

        console.log("Mapped products:", products.map((p) => p.name).join(", "));
      } else if (Array.isArray(productsResponse)) {
        // Handle old format (direct array)
        products = productsResponse;
      }

      // Lấy 5 sản phẩm đầu tiên làm Popular Items
      if (products && products.length > 0) {
        setPopularItems(products.slice(0, 5));
        console.log(
          "Popular products from API:",
          products
            .slice(0, 5)
            .map((p) => p.name)
            .join(", ")
        );
      }

      // Fetch categories
      const categoriesResponse = await api.getCategories();
      // Check if categoriesResponse exists and has expected structure
      console.log(
        "HomeScreen received categories:",
        JSON.stringify(categoriesResponse)
      );

      if (categoriesResponse && Array.isArray(categoriesResponse)) {
        console.log(
          "Setting categories from API:",
          categoriesResponse.map((c) => c.name).join(", ")
        );
        setCategories(categoriesResponse);
      }
    } catch (error) {
      console.error("Error fetching data", error);
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
      throw new Error("Invalid base64 string");
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
        console.log("Using userId from AuthContext getUserId:", userId);
      } catch (error) {
        console.error("Error getting userId from AuthContext:", error);

        // Fallback: Lấy từ user object
        if (user && user.id) {
          userId = user.id.toString();
          console.log("Using userId from user object fallback:", userId);
        }

        // Nếu vẫn không có, thử lấy từ AsyncStorage
        if (!userId) {
          try {
            const userData = await AsyncStorage.getItem("user_data");
            if (userData) {
              const parsedUser = JSON.parse(userData);
              if (parsedUser && parsedUser.id) {
                userId = parsedUser.id.toString();
                console.log("Using userId from AsyncStorage fallback:", userId);
              }
            }
          } catch (storageError) {
            console.error(
              "Error getting user data from AsyncStorage:",
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
      console.log("Using productId from selected item:", productId);

      console.log("Final cart data:", {
        userId,
        productId,
        quantity: 1,
      });

      // Gọi API
      const result = await api.addToCart(userId, productId, 1);
      console.log("Add to cart result:", result);

      Alert.alert("Thành công", `Đã thêm ${item.name} vào giỏ hàng`, [
        { text: "Tiếp tục mua sắm", style: "cancel" },
        { text: "Xem giỏ hàng", onPress: () => navigation.navigate("Cart") },
      ]);
    } catch (error: any) {
      console.error("Error adding to cart:", error);
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

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <View style={styles.card}>
      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
      )}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardDescription}>
          {item.description || "No description"}
        </Text>
        <Text style={styles.cardPrice}>
          {typeof item.price === "number"
            ? item.price.toLocaleString("vi-VN", {
                style: "currency",
                currency: "VND",
              })
            : "0 VND"}
        </Text>
        <Button
          title="Add to Cart"
          buttonStyle={styles.addButton}
          loading={addingToCart}
          onPress={() => addToCart(item)}
        />
      </View>
    </View>
  );

  const renderCategoryItem = (category: Category) => {
    console.log("Rendering category:", category);
    return (
      <TouchableOpacity
        key={category.id.toString()}
        style={styles.categoryButton}
        onPress={() =>
          navigation.navigate("Menu", {
            category: category.name,
            categoryId: category.id,
          })
        }
      >
        <Text style={styles.categoryButtonText}>{category.name}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8CC63F" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Food Order App</Text>
      <Text style={styles.subtitle}>Popular Items</Text>

      <FlatList
        data={popularItems}
        renderItem={renderMenuItem}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      <View style={styles.categoriesContainer}>
        <Text style={styles.subtitle}>Categories ({categories.length})</Text>
        <View style={styles.categoryButtonsContainer}>
          {categories.map((category) => renderCategoryItem(category))}
        </View>
      </View>
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
  subtitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    color: "#333",
  },
  listContainer: {
    paddingVertical: 8,
  },
  card: {
    width: 250,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    marginRight: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  cardImage: {
    height: 150,
    width: "100%",
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  cardDescription: {
    color: "#666",
    marginBottom: 8,
  },
  cardPrice: {
    fontWeight: "bold",
    color: "#8CC63F",
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: "#8CC63F",
    borderRadius: 5,
    marginTop: 4,
  },
  categoriesContainer: {
    marginTop: 16,
  },
  categoryButtonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryButton: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    width: "48%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  categoryButtonText: {
    fontWeight: "bold",
    color: "#333",
  },
});

export default HomeScreen;
