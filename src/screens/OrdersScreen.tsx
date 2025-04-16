import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
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
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(
    null
  );
  const [detailModalVisible, setDetailModalVisible] = useState(false);
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

      // Thêm log chi tiết để xem cấu trúc dữ liệu
      if (response && response.data) {
        console.log("Raw order data structure:", JSON.stringify(response.data));
      }

      if (response && response.isSuccess && response.data) {
        // Kiểm tra định dạng dữ liệu API trả về
        let ordersData = [];

        // Xử lý dữ liệu nếu có cấu trúc $values
        if (response.data.$values) {
          ordersData = response.data.$values;
        }
        // Xử lý nếu là mảng trực tiếp
        else if (Array.isArray(response.data)) {
          ordersData = response.data;
        }
        // Xử lý nếu là mảng trong thuộc tính data
        else if (response.data.data && Array.isArray(response.data.data)) {
          ordersData = response.data.data;
        }
        // Xử lý nếu là cấu trúc $values bên trong data
        else if (response.data.data && response.data.data.$values) {
          ordersData = response.data.data.$values;
        }

        console.log("Formatted orders:", ordersData);

        // Cho mỗi đơn hàng, gọi API chi tiết đơn hàng nếu orderDetails trống
        for (const order of ordersData) {
          // Chỉ gọi API tạo detail cho đơn hàng của chính người dùng hiện tại
          if (order.userId === userId) {
            if (
              !order.orderDetails ||
              (order.orderDetails.$values &&
                order.orderDetails.$values.length === 0) ||
              (Array.isArray(order.orderDetails) &&
                order.orderDetails.length === 0)
            ) {
              console.log(
                `Order ${order.orderId} has no details, fetching details...`
              );

              try {
                // Gọi API để lấy thông tin chi tiết đơn hàng
                // Sử dụng userId của đơn hàng, không phải userId của người dùng hiện tại
                const orderDetailResponse = await api.createOrderDetail({
                  orderId: order.orderId,
                  orderDetails: {
                    $values: [
                      {
                        orderId: order.orderId,
                        productId: order.productId || "",
                        productQuantity: order.quantity || 1,
                      },
                    ],
                  },
                });

                console.log(
                  `Order detail created for order ${order.orderId}:`,
                  orderDetailResponse
                );

                // Cập nhật orderDetails cho đơn hàng nếu API trả về thành công
                if (orderDetailResponse && orderDetailResponse.isSuccess) {
                  // Cập nhật đơn hàng trong danh sách với chi tiết mới
                  if (orderDetailResponse.data) {
                    order.orderDetails = orderDetailResponse.data;
                  }
                }
              } catch (detailError) {
                console.error(
                  `Error creating order detail for order ${order.orderId}:`,
                  detailError
                );
                // Tiếp tục xử lý các đơn hàng khác ngay cả khi có lỗi
              }
            }
          }
        }

        // Thêm sau phần xử lý chi tiết đơn hàng, trước khi setOrders
        // Cập nhật totalPrice cho những đơn hàng có chi tiết nhưng chưa có tổng tiền
        for (const order of ordersData) {
          // Kiểm tra nhiều định dạng totalPrice khác nhau
          if (
            !order.totalPrice ||
            order.totalPrice === 0 ||
            (typeof order.totalPrice === "string" &&
              parseFloat(order.totalPrice) === 0)
          ) {
            // Tính tổng tiền từ orderDetails
            const calculatedTotal = calculateOrderTotal(order);

            if (calculatedTotal > 0) {
              console.log(
                `Updated calculated total for order ${order.orderId}: ${calculatedTotal}`
              );
              // Cập nhật totalPrice
              order.totalPrice = calculatedTotal;

              // Cập nhật totalPrice trong orderDetails nếu có
              if (order.orderDetails) {
                try {
                  // Gọi API để cập nhật totalPrice cho đơn hàng trên server
                  await api.updateOrderTotal(order.orderId, calculatedTotal);
                  console.log(
                    `Updated order total on server for order ${order.orderId}`
                  );
                } catch (updateError) {
                  console.error(
                    `Failed to update order total on server:`,
                    updateError
                  );
                  // Tiếp tục xử lý dù có lỗi cập nhật server
                }
              }
            }
          }
        }

        setOrders(ordersData);
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

  const calculateOrderTotal = (item: OrderResponse) => {
    // Nếu đã có totalPrice từ server và lớn hơn 0, sử dụng nó
    const numericTotalPrice =
      typeof item.totalPrice === "string"
        ? parseFloat(item.totalPrice)
        : typeof item.totalPrice === "number"
        ? item.totalPrice
        : 0;

    if (numericTotalPrice > 0) {
      return numericTotalPrice;
    }

    // Tính tổng từ orderDetails nếu có
    if (
      item.orderDetails &&
      typeof item.orderDetails === "object" &&
      "$values" in item.orderDetails
    ) {
      const details = item.orderDetails.$values;
      if (Array.isArray(details)) {
        return details.reduce((total: number, detail: any) => {
          const quantity = detail.productQuantity || 0;
          const price = detail.price || 0;
          return total + price * quantity;
        }, 0);
      }
    }

    return 0;
  };

  const renderItem = ({ item }: { item: OrderResponse }) => {
    // Đếm số lượng sản phẩm trong đơn hàng
    const productCount =
      item.orderDetails &&
      typeof item.orderDetails === "object" &&
      "$values" in item.orderDetails &&
      Array.isArray(item.orderDetails.$values)
        ? item.orderDetails.$values.length
        : 0;

    const totalPrice = calculateOrderTotal(item);
    const status = item.orderStatus || item.status || "Pending";

    return (
      <TouchableOpacity
        style={styles.orderItem}
        onPress={() => handleViewOrderDetails(item)}
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
                  status === "Delivered"
                    ? "#4CAF50"
                    : status === "Cancelled"
                    ? "#F44336"
                    : "#FFC107",
              },
            ]}
          >
            <Text style={styles.statusText}>{formatOrderStatus(status)}</Text>
          </View>
        </View>

        <View style={styles.orderInfo}>
          <Text style={styles.orderDate}>
            Ngày đặt: {formatDate(item.orderDate)}
          </Text>
          <Text style={styles.productCount}>{productCount} sản phẩm</Text>
        </View>

        <Text style={styles.orderTotal}>
          Tổng tiền:{" "}
          {totalPrice > 0
            ? totalPrice.toLocaleString("vi-VN", {
                style: "currency",
                currency: "VND",
              })
            : "Đang cập nhật..."}
        </Text>

        <View style={styles.orderAddress}>
          <Text style={styles.consigneeName}>
            Người nhận: {item.consigneeName}
          </Text>
          <Text
            style={styles.deliveryAddress}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Địa chỉ: {item.deliverAddress}
          </Text>
          <Text style={styles.phoneNumber}>SĐT: {item.phoneNumber}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const handleViewOrderDetails = (order: OrderResponse) => {
    setSelectedOrder(order);
    setDetailModalVisible(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return "#4CAF50"; // Green
      case "Shipped":
        return "#2196F3"; // Blue
      case "Pending":
      case "Processing":
        return "#FFC107"; // Amber
      case "Cancelled":
        return "#F44336"; // Red
      default:
        return "#757575"; // Grey
    }
  };

  const renderOrderDetailModal = () => {
    if (!selectedOrder) return null;

    return (
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Chi tiết đơn hàng #{selectedOrder.orderId.substr(0, 8)}
            </Text>

            <ScrollView>
              <View style={styles.orderDetailSection}>
                <Text style={styles.sectionTitle}>Thông tin chung</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Mã đơn hàng:</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrder.orderId}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Trạng thái:</Text>
                  <View
                    style={[
                      styles.statusBadgeSmall,
                      {
                        backgroundColor: getStatusColor(
                          selectedOrder.orderStatus ||
                            selectedOrder.status ||
                            ""
                        ),
                      },
                    ]}
                  >
                    <Text style={styles.statusTextSmall}>
                      {formatOrderStatus(
                        selectedOrder.orderStatus || selectedOrder.status || ""
                      )}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ngày đặt:</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(selectedOrder.orderDate)}
                  </Text>
                </View>
              </View>

              <View style={styles.orderDetailSection}>
                <Text style={styles.sectionTitle}>Thông tin người nhận</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Họ tên:</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrder.consigneeName}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Số điện thoại:</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrder.phoneNumber}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Địa chỉ:</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrder.deliverAddress}
                  </Text>
                </View>
              </View>

              <View style={styles.orderDetailSection}>
                <Text style={styles.sectionTitle}>Chi tiết sản phẩm</Text>

                {selectedOrder.orderDetails &&
                typeof selectedOrder.orderDetails === "object" &&
                "$values" in selectedOrder.orderDetails &&
                selectedOrder.orderDetails.$values &&
                selectedOrder.orderDetails.$values.length > 0 ? (
                  selectedOrder.orderDetails.$values.map(
                    (item: any, index: number) => (
                      <View
                        key={item.orderDetailId || index}
                        style={styles.productItem}
                      >
                        <View style={styles.productInfo}>
                          <Text style={styles.productName}>
                            {item.productName ||
                              `Sản phẩm ID: ${item.productId}`}
                          </Text>
                          <Text style={styles.productQuantity}>
                            Số lượng:{" "}
                            {item.quantity || item.productQuantity || 0}
                          </Text>
                          {item.price && (
                            <Text style={styles.productPrice}>
                              Đơn giá:{" "}
                              {item.price.toLocaleString("vi-VN", {
                                style: "currency",
                                currency: "VND",
                              })}
                            </Text>
                          )}
                        </View>
                      </View>
                    )
                  )
                ) : (
                  <Text style={styles.emptyText}>
                    Không có thông tin chi tiết sản phẩm
                  </Text>
                )}
              </View>

              <View style={styles.orderDetailSection}>
                <Text style={styles.sectionTitle}>Tổng tiền đơn hàng</Text>
                <Text style={styles.totalAmount}>
                  {calculateOrderTotal(selectedOrder).toLocaleString("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  })}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setDetailModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Đóng</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

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
      {renderOrderDetailModal()}
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
  },
  orderDate: {
    fontSize: 14,
    color: "#666",
  },
  productCount: {
    fontSize: 14,
    color: "#666",
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
  },
  orderAddress: {
    marginTop: 10,
  },
  consigneeName: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  deliveryAddress: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 14,
    color: "#666",
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
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: "#333",
  },
  orderDetailSection: {
    marginBottom: 20,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 5,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#666",
  },
  detailValue: {
    fontSize: 14,
    maxWidth: "60%",
    textAlign: "right",
  },
  productItem: {
    backgroundColor: "#fff",
    borderRadius: 6,
    padding: 12,
    marginVertical: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#2196F3",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 4,
  },
  productQuantity: {
    fontSize: 14,
    color: "#666",
  },
  productPrice: {
    fontSize: 14,
    color: "#f50",
    marginTop: 2,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f50",
    textAlign: "center",
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusTextSmall: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  closeButton: {
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  closeButtonText: {
    color: "#333",
    fontWeight: "bold",
  },
});

export default OrdersScreen;
