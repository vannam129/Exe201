import React, { useState, useEffect } from "react";
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
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import { OrderResponse } from "../types";

const OrderManagerScreen = () => {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(
    null
  );
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Kiểm tra nếu không phải admin thì không cho phép truy cập
  useEffect(() => {
    if (!isAdmin()) {
      Alert.alert(
        "Không có quyền truy cập",
        "Bạn không có quyền quản lý đơn hàng."
      );
      return;
    }

    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      // Gọi API lấy tất cả đơn hàng từ admin
      try {
        const response = await api.fetchAllOrders();

        // Xử lý dữ liệu đơn hàng dựa trên cấu trúc API thực tế
        let ordersData = [];

        // Xử lý dữ liệu nếu có cấu trúc $values
        if (response && response.$values) {
          ordersData = response.$values;
        }
        // Xử lý nếu là mảng trực tiếp
        else if (Array.isArray(response)) {
          ordersData = response;
        }
        // Xử lý nếu là mảng trong thuộc tính data
        else if (response && response.data && Array.isArray(response.data)) {
          ordersData = response.data;
        }
        // Xử lý nếu là cấu trúc $values bên trong data
        else if (response && response.data && response.data.$values) {
          ordersData = response.data.$values;
        }

        // Sắp xếp đơn hàng theo thứ tự ưu tiên
        setOrders(sortOrders(ordersData));
      } catch (fetchError) {
        console.error("Lỗi khi sử dụng fetchAllOrders:", fetchError);

        // Fallback: Sử dụng getUserOrders của admin account nếu fetchAllOrders thất bại
        console.log("Quay lại sử dụng đơn hàng của quản trị viên");
        try {
          // Tìm userId có role là Admin từ data
          const adminId = "2e2b29dd-6c2d-4dc6-b1cf-8f900c124d0d"; // ID người dùng admin trong dữ liệu
          const response = await api.getUserOrders(adminId);

          if (response && response.isSuccess && response.data) {
            // Xử lý dữ liệu đơn hàng dựa trên cấu trúc API thực tế
            let ordersData = [];

            if (response.data.$values) {
              ordersData = response.data.$values;
            } else if (Array.isArray(response.data)) {
              ordersData = response.data;
            } else if (
              response.data.data &&
              Array.isArray(response.data.data)
            ) {
              ordersData = response.data.data;
            } else if (response.data.data && response.data.data.$values) {
              ordersData = response.data.data.$values;
            }

            // Sắp xếp đơn hàng theo thứ tự ưu tiên
            setOrders(sortOrders(ordersData));
          } else {
            console.warn(
              "Không thể tải đơn hàng:",
              response?.message || "Lỗi không xác định"
            );
            setOrders([]);
          }
        } catch (error) {
          console.error("Lỗi khi tải đơn hàng của quản trị viên:", error);
          setOrders([]);
        }
      }
    } catch (error) {
      console.error("Lỗi khi tải đơn hàng:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách đơn hàng.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Hàm sắp xếp đơn hàng theo thứ tự ưu tiên: Pending -> On delivery -> Done -> Cancelled
  const sortOrders = (orders: OrderResponse[]) => {
    return [...orders].sort((a, b) => {
      const statusA = a.orderStatus || a.status || "";
      const statusB = b.orderStatus || b.status || "";

      // Hàm để lấy điểm ưu tiên cho từng trạng thái
      const getPriorityScore = (status: string) => {
        switch (status) {
          case "Pending":
            return 0; // Ưu tiên cao nhất
          case "On delivery":
            return 1;
          case "Done":
            return 2;
          case "Cancelled":
            return 3; // Ưu tiên thấp nhất
          default:
            return 4; // Các trạng thái khác
        }
      };

      // So sánh theo điểm ưu tiên
      const priorityA = getPriorityScore(statusA);
      const priorityB = getPriorityScore(statusB);

      // Nếu cùng mức ưu tiên, sắp xếp theo thời gian tạo đơn (mới nhất lên đầu)
      if (priorityA === priorityB) {
        // Giả sử có orderDate và nó là string dạng ISO
        const dateA = new Date(a.orderDate || 0).getTime();
        const dateB = new Date(b.orderDate || 0).getTime();
        return dateB - dateA; // Sắp xếp giảm dần theo thời gian
      }

      return priorityA - priorityB;
    });
  };

  const handleViewOrderDetails = (order: OrderResponse) => {
    setSelectedOrder(order);
    setDetailModalVisible(true);
  };

  const handleUpdateOrderStatus = (order: OrderResponse, newStatus: string) => {
    Alert.alert(
      "Xác nhận cập nhật",
      `Bạn có chắc muốn ${
        newStatus === "Cancelled" ? "hủy" : "cập nhật trạng thái"
      } đơn hàng ${order.orderId.substr(0, 8)} ${
        newStatus !== "Cancelled"
          ? `thành "${formatOrderStatus(newStatus)}"`
          : ""
      }?`,
      [
        { text: "Không", style: "cancel" },
        {
          text: newStatus === "Cancelled" ? "Hủy đơn hàng" : "Cập nhật",
          onPress: async () => {
            try {
              if (newStatus === "Cancelled") {
                // Gọi API xóa đơn hàng
                const response = await api.deleteOrder(order.orderId);
                console.log("Phản hồi xóa đơn hàng:", response);

                // Cập nhật local state (lọc order đã xóa khỏi danh sách)
                const updatedOrders = orders.filter(
                  (o) => o.orderId !== order.orderId
                );

                // Sắp xếp lại danh sách đơn hàng sau khi hủy đơn
                setOrders(sortOrders(updatedOrders));

                if (detailModalVisible) {
                  setDetailModalVisible(false);
                }

                Alert.alert(
                  "Thành công",
                  "Đã hủy và xóa đơn hàng khỏi hệ thống."
                );
              } else {
                // Gọi API cập nhật trạng thái đơn hàng
                const response = await api.updateOrderStatus(
                  order.orderId,
                  newStatus
                );

                if (response && response.isSuccess === false) {
                  throw new Error(
                    response.message || "Không thể cập nhật trạng thái đơn hàng"
                  );
                }

                // Cập nhật local state
                const updatedOrders = orders.map((o) =>
                  o.orderId === order.orderId
                    ? { ...o, status: newStatus, orderStatus: newStatus }
                    : o
                );

                // Sắp xếp lại danh sách đơn hàng sau khi cập nhật trạng thái
                setOrders(sortOrders(updatedOrders));

                // Cập nhật selectedOrder nếu đang xem chi tiết
                if (selectedOrder && selectedOrder.orderId === order.orderId) {
                  setSelectedOrder({
                    ...selectedOrder,
                    status: newStatus,
                    orderStatus: newStatus,
                  });
                }

                Alert.alert("Thành công", "Đã cập nhật trạng thái đơn hàng.");
              }
            } catch (error: any) {
              console.error("Lỗi khi cập nhật đơn hàng:", error);
              Alert.alert(
                "Lỗi",
                error.message || "Không thể thực hiện yêu cầu."
              );
            }
          },
        },
      ]
    );
  };

  const formatOrderStatus = (status: string) => {
    switch (status) {
      case "Pending":
        return "Chờ xử lý";
      case "On delivery":
        return "Đang giao hàng";
      case "Done":
        return "Hoàn thành";
      case "Cancelled":
        return "Đã hủy";
      default:
        return status || "Không xác định";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Done":
        return "#4CAF50"; // Green
      case "On delivery":
        return "#2196F3"; // Blue
      case "Pending":
        return "#FFC107"; // Amber
      case "Cancelled":
        return "#F44336"; // Red
      default:
        return "#757575"; // Grey
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

  const calculateOrderTotal = (order: OrderResponse): number => {
    if (typeof order.totalPrice === "number" && order.totalPrice > 0) {
      return order.totalPrice;
    }

    if (
      typeof order.totalPrice === "string" &&
      !isNaN(parseFloat(order.totalPrice))
    ) {
      return parseFloat(order.totalPrice);
    }

    // Tính tổng từ chi tiết đơn hàng nếu có
    if (order.orderDetails) {
      // Trường hợp orderDetails là mảng
      if (Array.isArray(order.orderDetails)) {
        return order.orderDetails.reduce(
          (total, detail) =>
            total + (detail.price || 0) * (detail.quantity || 0),
          0
        );
      }

      // Trường hợp orderDetails.$values là mảng
      if (
        typeof order.orderDetails === "object" &&
        "$values" in order.orderDetails &&
        order.orderDetails.$values &&
        Array.isArray(order.orderDetails.$values)
      ) {
        return order.orderDetails.$values.reduce(
          (total, detail) =>
            total +
            (detail.price || 0) *
              (detail.quantity || detail.productQuantity || 0),
          0
        );
      }
    }

    return 0;
  };

  const renderOrderItem = ({ item }: { item: OrderResponse }) => (
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
              backgroundColor: getStatusColor(
                item.orderStatus || item.status || ""
              ),
            },
          ]}
        >
          <Text style={styles.statusText}>
            {formatOrderStatus(item.orderStatus || item.status || "")}
          </Text>
        </View>
      </View>

      <View style={styles.orderInfo}>
        <Text style={styles.orderInfoText}>
          <Text style={styles.orderInfoLabel}>Khách hàng: </Text>
          {item.consigneeName}
        </Text>
        <Text style={styles.orderInfoText}>
          <Text style={styles.orderInfoLabel}>SĐT: </Text>
          {item.phoneNumber}
        </Text>
        <Text style={styles.orderInfoText}>
          <Text style={styles.orderInfoLabel}>Địa chỉ: </Text>
          {item.deliverAddress}
        </Text>
        <Text style={styles.orderInfoText}>
          <Text style={styles.orderInfoLabel}>Ngày đặt: </Text>
          {formatDate(item.orderDate)}
        </Text>
        <Text style={styles.orderTotal}>
          <Text style={styles.orderInfoLabel}>Tổng tiền: </Text>
          {calculateOrderTotal(item).toLocaleString("vi-VN", {
            style: "currency",
            currency: "VND",
          })}
        </Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#2196F3" }]}
          onPress={() => handleUpdateOrderStatus(item, "On delivery")}
        >
          <Text style={styles.actionButtonText}>Giao hàng</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#4CAF50" }]}
          onPress={() => handleUpdateOrderStatus(item, "Done")}
        >
          <Text style={styles.actionButtonText}>Hoàn thành</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#F44336" }]}
          onPress={() => handleUpdateOrderStatus(item, "Cancelled")}
        >
          <Text style={styles.actionButtonText}>Hủy đơn</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

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
                <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>
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

              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "#2196F3" }]}
                  onPress={() => {
                    handleUpdateOrderStatus(selectedOrder, "On delivery");
                    setDetailModalVisible(false);
                  }}
                >
                  <Text style={styles.modalButtonText}>Giao hàng</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "#4CAF50" }]}
                  onPress={() => {
                    handleUpdateOrderStatus(selectedOrder, "Done");
                    setDetailModalVisible(false);
                  }}
                >
                  <Text style={styles.modalButtonText}>Hoàn thành</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "#F44336" }]}
                  onPress={() => {
                    setDetailModalVisible(false);
                    handleUpdateOrderStatus(selectedOrder, "đã hủy");
                  }}
                >
                  <Text style={styles.modalButtonText}>Hủy đơn</Text>
                </TouchableOpacity>
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quản lý đơn hàng</Text>

      <TouchableOpacity style={styles.refreshButton} onPress={fetchOrders}>
        <Text style={styles.refreshButtonText}>Làm mới danh sách</Text>
      </TouchableOpacity>

      {orders.length === 0 ? (
        <Text style={styles.emptyText}>Chưa có đơn hàng nào</Text>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.orderId}
          contentContainerStyle={styles.listContainer}
        />
      )}

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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  refreshButton: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  refreshButtonText: {
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
    fontStyle: "italic",
  },
  orderItem: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 8,
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
  orderInfo: {
    marginBottom: 12,
  },
  orderInfoText: {
    fontSize: 14,
    marginBottom: 4,
  },
  orderInfoLabel: {
    fontWeight: "bold",
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 4,
    color: "#f50",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 5,
    minWidth: "30%",
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
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
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 20,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    minWidth: "30%",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
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

export default OrderManagerScreen;
