import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigators/AppNavigator";
import api from "../services/api";
import { MenuItem } from "../types";
import { Button } from "react-native-elements";

type MenuScreenRouteProp = RouteProp<RootStackParamList, "Menu">;

interface MenuScreenProps {
  route?: MenuScreenRouteProp;
}

const MenuScreen: React.FC<MenuScreenProps> = ({ route }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const category = route?.params?.category || "All";
  const categoryId = route?.params?.categoryId;

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setLoading(true);
        let products: MenuItem[] = [];

        if (categoryId) {
          // Nếu có categoryId, sử dụng API Product với categoryId
          console.log(`Fetching products for categoryId: ${categoryId}`);
          products = await api.getProductsByCategory(categoryId.toString());
        } else {
          // Nếu không có categoryId, lấy tất cả sản phẩm
          console.log("Fetching all products");
          products = await api.getProducts();
        }

        console.log(
          `Found ${products.length} products for category: ${category}`
        );
        setMenuItems(products);
      } catch (error) {
        console.error(`Error fetching products for ${category}`, error);
        // Set fallback data in case of error
        setMenuItems([
          {
            id: 1,
            name: "Sample Item",
            description: "This is a sample menu item",
            price: 9.99,
            category: category,
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, [category, categoryId]);

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
          onPress={() => {
            // Add to cart functionality
            console.log("Added to cart:", item);
          }}
        />
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
      <Text style={styles.title}>Menu</Text>
      <Text style={styles.categoryTitle}>Category: {category}</Text>

      {menuItems.length > 0 ? (
        <FlatList
          data={menuItems}
          renderItem={renderMenuItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <Text style={styles.noItemsText}>
          No menu items found for this category
        </Text>
      )}
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
    marginBottom: 8,
    color: "#333",
  },
  categoryTitle: {
    fontSize: 18,
    marginBottom: 16,
    color: "#666",
  },
  listContainer: {
    paddingBottom: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  cardImage: {
    height: 180,
    width: "100%",
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  cardDescription: {
    color: "#666",
    marginBottom: 8,
  },
  cardPrice: {
    fontWeight: "bold",
    color: "#f50",
    marginBottom: 8,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: "#f50",
    borderRadius: 5,
    marginTop: 4,
  },
  noItemsText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
    color: "#666",
  },
});

export default MenuScreen;
