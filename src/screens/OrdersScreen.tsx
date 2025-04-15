import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigators/AppNavigator";
import { OrderResponse } from "../types";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";

type OrdersScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Orders"
>;

const OrdersScreen: React.FC = () => {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<OrdersScreenNavigationProp>();
  const { isAuthenticated, getUserId } = useAuth();

  useEffect(() => {
    fetchOrders();

    // Refresh khi quay lại màn hình này
    const unsubscribe = navigation.addListener("focus", () => {
      if (isAuthenticated) {
        fetchOrders();
      }
    });

    return unsubscribe;
  }, [navigation, isAuthenticated]);

  const fetchOrders = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userId = await getUserId();
      console.log("Fetching orders for user:", userId);

      const response = await api.getUserOrders(userId);
      console.log("Orders response:", response);

      if (response && response.isSuccess && response.data) {
        // Cấu trúc dữ liệu từ API: {isSuccess: true, data: [Order1, Order2, ...]}
        const formattedOrders = Array.isArray(response.data)
          ? response.data
          : [];

        console.log("Formatted orders:", formattedOrders);
        setOrders(formattedOrders);
      } else {
        console.warn(
          "Failed to fetch orders:",
          response?.message || "Unknown error"
        );
        setOrders([]);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      Alert.alert(
        "Lỗi",
        "Không thể tải danh sách đơn hàng. Vui lòng thử lại sau."
      );
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const formatOrderStatus = (status: string) => {
    switch (status) {
      case "Pending":
        return "Đang chờ xử lý";
      case "Processing":
        return "Đang xử lý";
      case "Shipped":
        return "Đang giao hàng";
      case "Delivered":
        return "Đã giao hàng";
      case "Cancelled":
        return "Đã hủy";
      default:
        return status || "Không xác định";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderItem = ({ item }: { item: OrderResponse }) => (
    <TouchableOpacity
      style={styles.orderItem}
      onPress={() =>
        navigation.navigate("OrderDetails", { orderId: item.orderId })
      }
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>
          Đơn hàng #{item.orderId.substr(0, 8)}
        </Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.orderStatus === "Delivered"
                  ? "#4CAF50"
                  : item.orderStatus === "Cancelled"
                  ? "#F44336"
                  : "#FFC107",
            },
          ]}
        >
          <Text style={styles.statusText}>
            {formatOrderStatus(item.orderStatus)}
          </Text>
        </View>
      </View>

      <View style={styles.orderInfo}>
        <Text style={styles.orderDate}>
          Ngày đặt: {formatDate(item.orderDate)}
        </Text>
        <Text style={styles.orderTotal}>
          Tổng tiền:{" "}
          {item.totalAmount.toLocaleString("vi-VN", {
            style: "currency",
            currency: "VND",
          })}
        </Text>
      </View>

      <View style={styles.orderAddress}>
        <Text numberOfLines={1} ellipsizeMode="tail">
          Giao hàng đến: {item.deliverAddress}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f50" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Vui lòng đăng nhập để xem đơn hàng</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.loginButtonText}>Đăng nhập</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Bạn chưa có đơn hàng nào</Text>
        <TouchableOpacity
          style={styles.shopButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.shopButtonText}>Mua sắm ngay</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đơn hàng của tôi</Text>
      <FlatList
        data={orders}
        renderItem={renderItem}
        keyExtractor={(item) => item.orderId}
        contentContainerStyle={styles.listContainer}
      />
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  loginButton: {
    backgroundColor: "#f50",
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 5,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  shopButton: {
    backgroundColor: "#f50",
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 5,
  },
  shopButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  listContainer: {
    flexGrow: 1,
  },
  orderItem: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  orderId: {
    fontSize: 16,
    fontWeight: "bold",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  orderInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  orderDate: {
    color: "#666",
  },
  orderTotal: {
    fontWeight: "bold",
    color: "#f50",
  },
  orderAddress: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
  },
});

export default OrdersScreen;
