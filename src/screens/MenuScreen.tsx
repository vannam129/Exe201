import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigators/AppNavigator";
import api from "../services/api";
import { MenuItem } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useNavigation } from "@react-navigation/native";

type MenuScreenRouteProp = RouteProp<RootStackParamList, "Menu">;

interface MenuScreenProps {
  route?: MenuScreenRouteProp;
}

interface ProductApiItem {
  productId: string;
  productName: string;
  price: number;
  description: string;
  status: boolean;
  imageURL: string;
  categoryId: string;
  category?: string;
}

interface ApiResponse {
  $id: string;
  isSuccess: boolean;
  message: string | null;
  data: {
    $id: string;
    $values: ProductApiItem[];
  };
}

const MenuScreen: React.FC<MenuScreenProps> = ({ route }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const category = route?.params?.category || "All";
  const categoryId = route?.params?.categoryId;
  const { isAuthenticated, user, getUserId } = useAuth();
  const navigation = useNavigation();

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      let products: MenuItem[] = [];

      if (categoryId) {
        console.log(
          `[DEBUG] Fetching products for categoryId: ${categoryId}, category name: ${category}`
        );
        const response = await api.getProductsByCategory(categoryId.toString());

        console.log(
          `[DEBUG] Found ${response.length} products for category: ${category}`
        );
        if (response.length === 0) {
          console.log("[DEBUG] No products found. This might be an issue.");
        } else {
          console.log(
            "[DEBUG] Products found:",
            response.map((p) => ({
              id: p.id,
              name: p.name,
              categoryId: p.categoryId,
            }))
          );
        }

        setMenuItems(response);
      } else {
        console.log("[DEBUG] Fetching all products");
        const response = await api.getProducts();

        console.log(`[DEBUG] Found ${response.length} products`);
        if (response.length === 0) {
          console.log("[DEBUG] No products found. This might be an issue.");
        } else {
          console.log(
            "[DEBUG] Products found:",
            response.map((p) => ({
              id: p.id,
              name: p.name,
              categoryId: p.categoryId,
            }))
          );
        }

        setMenuItems(response);
      }
    } catch (error) {
      console.error("[DEBUG] Error details:", {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        categoryId,
        category,
      });
      Alert.alert(
        "Error",
        "Could not load menu items. Please try again later."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, [category, categoryId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMenuItems();
  }, [categoryId, category]);

  const addToCart = async (item: MenuItem) => {
    if (!isAuthenticated || !user) {
      Alert.alert("Login Required", "Please login to add items to cart", [
        { text: "Cancel", style: "cancel" },
        { text: "Login", onPress: () => navigation.navigate("Login" as never) },
      ]);
      return;
    }

    try {
      setAddingToCart(item.id.toString());
      const userId = await getUserId();
      await api.addToCart(userId, item.id.toString(), 1);
      Alert.alert("Success", `Added ${item.name} to cart`, [
        { text: "Continue Shopping", style: "cancel" },
        {
          text: "View Cart",
          onPress: () => navigation.navigate("Cart" as never),
        },
      ]);
    } catch (error) {
      console.error("Error adding to cart:", error);
      Alert.alert("Error", "Could not add item to cart. Please try again.");
    } finally {
      setAddingToCart(null);
    }
  };

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <View style={styles.card}>
      <Image
        source={{ uri: item.imageUrl || "https://via.placeholder.com/150" }}
        style={styles.cardImage}
        resizeMode="cover"
      />
      <View style={styles.cardOverlay}>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description || "No description"}
          </Text>
          <View style={styles.cardFooter}>
            <Text style={styles.cardPrice}>
              {item.price.toLocaleString("vi-VN", {
                style: "currency",
                currency: "VND",
              })}
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => addToCart(item)}
              disabled={addingToCart === item.id.toString()}
            >
              {addingToCart === item.id.toString() ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.addButtonText}>+</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
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
      <View style={styles.header}>
        <Text style={styles.categoryTitle}>{category}</Text>
        <Text style={styles.itemCount}>{menuItems.length} items</Text>
      </View>

      {menuItems.length > 0 ? (
        <FlatList
          data={menuItems}
          renderItem={renderMenuItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No menu items found for this category
          </Text>
        </View>
      )}
    </View>
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
  categoryTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  itemCount: {
    fontSize: 16,
    color: "#666",
  },
  listContainer: {
    padding: 15,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    marginBottom: 15,
    height: 200,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  cardContent: {
    padding: 15,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  cardDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f50",
  },
  addButton: {
    backgroundColor: "#f50",
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});

export default MenuScreen;
