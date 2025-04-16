import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Button } from "react-native-elements";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigators/AppNavigator";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { CartItem } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Icon from "react-native-vector-icons/FontAwesome";

type CartScreenNavigationProp = StackNavigationProp<RootStackParamList, "Cart">;

const CartScreen: React.FC = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [orderForm, setOrderForm] = useState({
    consigneeName: "",
    deliverAddress: "",
    phoneNumber: "",
  });
  const defaultDeliveryId = "0ef44e02-4515-4c8a-9b93-b123840290fe";

  const navigation = useNavigation<CartScreenNavigationProp>();
  const { user, isAuthenticated, getUserId, logout } = useAuth();

  // Kiểm tra role từ user context
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const userData = await AsyncStorage.getItem("user_data");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          if (parsedUser.role === "Admin") {
            // Nếu là Admin, chuyển về màn hình Home
            navigation.navigate("Home");
            return;
          }
        }
      } catch (error) {
        console.error("Error checking user role:", error);
      }
    };
    checkUserRole();
  }, [navigation]);

  // Nếu user là Admin, không render gì cả
  if (user?.role === "Admin") {
    return null;
  }

  // Hàm xử lý chuyển đến màn hình đăng nhập
  const handleLoginRedirect = () => {
    logout(); // Logout để AppNavigator tự chuyển sang AuthStack
  };

  useEffect(() => {
    fetchCartItems();

    // Thêm listener để kiểm tra lại khi focus vào màn hình (sau khi đăng nhập)
    const unsubscribe = navigation.addListener("focus", () => {
      if (isAuthenticated) {
        console.log("Cart screen focused, refreshing cart items...");
        fetchCartItems();
      }
    });

    return unsubscribe;
  }, [navigation, isAuthenticated]);

  const fetchCartItems = async () => {
    if (!isAuthenticated) {
      console.log("Not authenticated, skipping cart fetch");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Log trạng thái đăng nhập để debug
      console.log("Auth state before fetch:", {
        isAuthenticated,
        hasUser: !!user,
        userId: user?.id || user?.userId,
      });

      // Kiểm tra xem user có tồn tại không
      if (!user) {
        console.log("User not found in state, checking AsyncStorage");
        const userData = await AsyncStorage.getItem("user_data");
        if (!userData) {
          console.log("User not found in AsyncStorage, showing login prompt");
          setLoading(false);
          return;
        }

        console.log("Found user data in AsyncStorage:", userData);
      }

      try {
        const userId = await getUserId();
        console.log("Fetching cart for userId:", userId);

        // Gọi API giỏ hàng với userId
        const response = await api.getCart(userId);
        console.log("Cart API response:", JSON.stringify(response, null, 2));

        // Xử lý phản hồi API
        if (response && response.isSuccess && response.data) {
          let cartItems = [];

          // Lấy products trực tiếp từ response.data.products
          if (response.data.products && Array.isArray(response.data.products)) {
            cartItems = response.data.products;
            console.log(
              "Cart items from response:",
              JSON.stringify(cartItems, null, 2)
            );
          }

          // Lọc bỏ các sản phẩm có quantity = 0 và chuyển đổi dữ liệu
          cartItems = cartItems
            .filter((item: { quantity: number }) => item.quantity > 0)
            .map((item: any) => ({
              id: item.productId,
              productId: item.productId,
              productName: item.productName,
              price: item.price,
              quantity: item.quantity,
              imageURL: item.imageURL,
            }));

          console.log(
            "Final formatted cart items:",
            JSON.stringify(cartItems, null, 2)
          );
          setCartItems(cartItems);
        } else {
          console.log("Cart is empty or invalid response");
          setCartItems([]);
        }
      } catch (idError) {
        console.error("Error getting userId:", idError);
        Alert.alert(
          "Lỗi đăng nhập",
          "Không thể lấy thông tin người dùng. Vui lòng đăng nhập lại.",
          [
            { text: "Hủy", style: "cancel" },
            { text: "Đăng nhập", onPress: handleLoginRedirect },
          ]
        );
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
      Alert.alert("Lỗi", "Không thể tải giỏ hàng. Vui lòng thử lại sau.");
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (item: CartItem, newQuantity: number) => {
    if (newQuantity < 1) {
      Alert.alert(
        "Xác nhận xóa",
        "Bạn có muốn xóa sản phẩm này khỏi giỏ hàng?",
        [
          { text: "Hủy", style: "cancel" },
          { text: "Xóa", onPress: () => removeItem(item) },
        ]
      );
      return;
    }

    if (!isAuthenticated) {
      Alert.alert("Đăng nhập", "Vui lòng đăng nhập để cập nhật giỏ hàng");
      return;
    }

    try {
      setUpdating(true);

      // Lấy userId từ AuthContext
      const userId = await getUserId();

      console.log("Updating cart item:", {
        userId,
        productId: item.productId,
        quantity: newQuantity,
      });

      const response = await api.updateCartItem(
        userId,
        item.productId,
        newQuantity
      );

      if (response && response.isSuccess) {
        console.log("Cart update successful:", response);

        // Cập nhật local state để tránh phải refresh toàn bộ giỏ hàng
        setCartItems((currentItems) =>
          currentItems.map((cartItem) =>
            cartItem.productId === item.productId
              ? { ...cartItem, quantity: newQuantity }
              : cartItem
          )
        );
      } else {
        // Nếu cập nhật thất bại, làm mới toàn bộ giỏ hàng
        fetchCartItems();
      }
    } catch (error) {
      console.error("Error updating cart:", error);
      Alert.alert("Lỗi", "Không thể cập nhật giỏ hàng. Vui lòng thử lại sau.");
      fetchCartItems(); // Refresh để đồng bộ lại với server
    } finally {
      setUpdating(false);
    }
  };

  const removeItem = async (item: CartItem, showAlert: boolean = true) => {
    if (!isAuthenticated) {
      Alert.alert("Đăng nhập", "Vui lòng đăng nhập để xóa sản phẩm");
      return;
    }

    try {
      setUpdating(true);

      // Lấy userId từ AuthContext
      const userId = await getUserId();
      console.log("Removing cart item:", { userId, productId: item.productId });

      // Gọi API xóa sản phẩm (quantity=0)
      const response = await api.removeFromCart(userId, item.productId);

      if (response && response.isSuccess) {
        // Xóa sản phẩm khỏi state local
        setCartItems((currentItems) =>
          currentItems.filter(
            (cartItem) => cartItem.productId !== item.productId
          )
        );

        // Thông báo xóa thành công - chỉ hiển thị khi được yêu cầu (xóa đơn lẻ)
        if (showAlert) {
          Alert.alert("Thành công", "Đã xóa sản phẩm khỏi giỏ hàng");
        }
      } else {
        Alert.alert("Lỗi", "Không thể xóa sản phẩm. Vui lòng thử lại sau.");
        fetchCartItems(); // Refresh lại giỏ hàng nếu thất bại
      }
    } catch (error) {
      console.error("Error removing from cart:", error);
      Alert.alert("Lỗi", "Không thể xóa sản phẩm. Vui lòng thử lại sau.");
      fetchCartItems(); // Refresh để đồng bộ lại với server
    } finally {
      setUpdating(false);
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      {item.imageURL && (
        <Image source={{ uri: item.imageURL }} style={styles.itemImage} />
      )}
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.productName}</Text>
        <Text style={styles.itemPrice}>
          {item.price.toLocaleString("vi-VN", {
            style: "currency",
            currency: "VND",
          })}
        </Text>

        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item, item.quantity - 1)}
            disabled={updating}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>

          <Text style={styles.quantity}>{item.quantity}</Text>

          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item, item.quantity + 1)}
            disabled={updating}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => {
          Alert.alert(
            "Xác nhận xóa",
            `Bạn có chắc muốn xóa ${item.productName} khỏi giỏ hàng?`,
            [
              { text: "Hủy", style: "cancel" },
              { text: "Xóa", onPress: () => removeItem(item) },
            ]
          );
        }}
        disabled={updating}
      >
        <Text style={styles.removeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  // Xử lý đặt hàng
  const handleCheckout = async () => {
    setCheckoutModalVisible(true);
  };

  // Xác nhận đặt hàng
  const confirmOrder = async () => {
    if (
      !orderForm.consigneeName ||
      !orderForm.deliverAddress ||
      !orderForm.phoneNumber
    ) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin giao hàng");
      return;
    }

    try {
      setUpdating(true);

      // Lấy userId
      const userId = await getUserId();

      // Tạo đơn hàng theo cấu trúc API như yêu cầu
      const orderData = {
        userId: userId,
        consigneeName: orderForm.consigneeName,
        deliverAddress: orderForm.deliverAddress,
        phoneNumber: orderForm.phoneNumber,
      };

      console.log("Creating order with data:", orderData);

      // Gọi API tạo đơn hàng
      const response = await api.createOrder(orderData);

      console.log("Order response received:", response);

      if (!response) {
        throw new Error("Không nhận được phản hồi từ server khi tạo đơn hàng");
      }

      if (response.isSuccess === false) {
        throw new Error(response.message || "Không thể tạo đơn hàng");
      }

      // Lấy orderId từ response
      const orderId =
        response.data?.orderId ||
        (response.data && response.data.data && response.data.data.orderId);

      if (!orderId) {
        console.warn(
          "Không tìm thấy orderId trong phản hồi API, không thể tạo chi tiết đơn hàng"
        );
      } else {
        console.log("Tạo chi tiết đơn hàng với orderId:", orderId);

        // Thêm delay trước khi tạo chi tiết đơn hàng để đảm bảo đơn hàng đã được lưu đầy đủ trên server
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Tạo chi tiết đơn hàng cho từng sản phẩm trong giỏ hàng
        try {
          // Đảm bảo chúng ta có danh sách sản phẩm để tạo chi tiết
          if (cartItems.length === 0) {
            console.warn(
              "Không có sản phẩm nào trong giỏ hàng để tạo chi tiết đơn hàng"
            );
          }

          // Tạo orderDetails với cấu trúc $values
          const orderDetails = {
            $values: cartItems.map((item) => ({
              orderId: orderId,
              productId: item.productId,
              productQuantity: item.quantity,
            })),
          };

          console.log(
            "Creating order details with structure:",
            JSON.stringify(orderDetails, null, 2)
          );

          // Gọi API để tạo tất cả chi tiết đơn hàng
          const detailResponse = await api.createOrderDetail({
            orderId: orderId,
            orderDetails: orderDetails,
          });

          if (detailResponse) {
            console.log(
              "Order details created successfully:",
              JSON.stringify(detailResponse, null, 2)
            );
          } else {
            console.error("No response received when creating order details");
          }
        } catch (detailError) {
          console.error("Error creating order details:", detailError);
        }
      }

      // BE sẽ tự xóa giỏ hàng, chỉ cần cập nhật UI
      setCartItems([]);

      // Đóng modal và hiển thị thông báo thành công
      setCheckoutModalVisible(false);
      Alert.alert(
        "Đặt hàng thành công",
        "Đơn hàng của bạn đã được tạo thành công",
        [
          {
            text: "Xem đơn hàng",
            onPress: () => navigation.navigate("Orders"),
          },
          {
            text: "Tiếp tục mua sắm",
            onPress: () => navigation.navigate("Home"),
            style: "default",
          },
        ]
      );

      // Reset form
      setOrderForm({
        consigneeName: "",
        deliverAddress: "",
        phoneNumber: "",
      });
    } catch (error: any) {
      console.error("Error creating order:", error);
      Alert.alert(
        "Lỗi",
        error.message || "Không thể tạo đơn hàng. Vui lòng thử lại sau."
      );
    } finally {
      setUpdating(false);
    }
  };

  // Render modal nhập thông tin đặt hàng
  const renderCheckoutModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={checkoutModalVisible}
      onRequestClose={() => setCheckoutModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <ScrollView>
            <Text style={styles.modalTitle}>Thông tin đặt hàng</Text>

            <Text style={styles.sectionTitle}>Thông tin giao hàng</Text>

            <Text style={styles.inputLabel}>Tên người nhận</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập tên người nhận"
              value={orderForm.consigneeName}
              onChangeText={(text) =>
                setOrderForm({ ...orderForm, consigneeName: text })
              }
            />

            <Text style={styles.inputLabel}>Địa chỉ giao hàng</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập địa chỉ giao hàng"
              value={orderForm.deliverAddress}
              onChangeText={(text) =>
                setOrderForm({ ...orderForm, deliverAddress: text })
              }
              multiline
            />

            <Text style={styles.inputLabel}>Số điện thoại</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập số điện thoại"
              value={orderForm.phoneNumber}
              onChangeText={(text) =>
                setOrderForm({ ...orderForm, phoneNumber: text })
              }
              keyboardType="phone-pad"
            />

            <Text style={styles.sectionTitle}>Tóm tắt đơn hàng</Text>

            {cartItems.map((item) => (
              <View key={item.id} style={styles.orderItemSummary}>
                <Text style={styles.orderItemName}>
                  {item.productName} x{item.quantity}
                </Text>
                <Text style={styles.orderItemPrice}>
                  {(item.price * item.quantity).toLocaleString("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  })}
                </Text>
              </View>
            ))}

            <View style={styles.totalContainer}>
              <Text style={styles.totalText}>Tổng cộng:</Text>
              <Text style={styles.totalAmount}>
                {calculateTotal().toLocaleString("vi-VN", {
                  style: "currency",
                  currency: "VND",
                })}
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <Button
                title="Hủy"
                buttonStyle={styles.cancelButton}
                onPress={() => setCheckoutModalVisible(false)}
              />
              <Button
                title="Xác nhận đặt hàng"
                buttonStyle={styles.confirmButton}
                loading={updating}
                onPress={confirmOrder}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (!isAuthenticated) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Vui lòng đăng nhập để xem giỏ hàng</Text>
        <Button
          title="Đăng nhập"
          buttonStyle={styles.loginButton}
          onPress={handleLoginRedirect}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f50" />
      </View>
    );
  }

  if (cartItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Giỏ hàng của bạn đang trống</Text>
        <Button
          title="Tiếp tục mua hàng"
          buttonStyle={styles.shopButton}
          onPress={() => navigation.navigate("Home")}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Giỏ hàng</Text>

      <FlatList
        data={cartItems}
        renderItem={renderCartItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
      />

      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>Tổng cộng:</Text>
        <Text style={styles.totalPrice}>
          {calculateTotal().toLocaleString("vi-VN", {
            style: "currency",
            currency: "VND",
          })}
        </Text>
      </View>

      <Button
        title="Tiến hành đặt hàng"
        buttonStyle={styles.checkoutButton}
        onPress={handleCheckout}
        disabled={cartItems.length === 0}
      />

      {renderCheckoutModal()}
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
  },
  loginButton: {
    backgroundColor: "#f50",
    paddingHorizontal: 30,
  },
  shopButton: {
    backgroundColor: "#f50",
    paddingHorizontal: 30,
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
  cartItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#f50",
    marginBottom: 8,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  quantityButton: {
    backgroundColor: "#f0f0f0",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  quantity: {
    marginHorizontal: 10,
    fontSize: 16,
    fontWeight: "bold",
  },
  removeButton: {
    padding: 10,
  },
  removeButtonText: {
    color: "#999",
    fontSize: 18,
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: 10,
  },
  summaryText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f50",
  },
  checkoutButton: {
    backgroundColor: "#f50",
    borderRadius: 5,
    margin: 10,
    padding: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: "90%",
    maxHeight: "85%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#f50",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10,
    color: "#333",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 5,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#555",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    backgroundColor: "#f9f9f9",
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  totalText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f50",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  cancelButton: {
    backgroundColor: "#ccc",
    padding: 12,
    borderRadius: 5,
    width: "48%",
  },
  confirmButton: {
    backgroundColor: "#f50",
    padding: 12,
    borderRadius: 5,
    width: "48%",
  },
  orderItemSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 5,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  orderItemPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#f50",
  },
});

export default CartScreen;
