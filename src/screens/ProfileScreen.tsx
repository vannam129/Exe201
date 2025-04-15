import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Button,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigators/AppNavigator";
import { Ionicons } from "@expo/vector-icons";

type ProfileScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Profile"
>;

const ProfileScreen = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  const navigateToAdminScreen = (screenName: keyof RootStackParamList) => {
    if (isAdmin()) {
      // @ts-ignore - Điều hướng đến màn hình admin
      navigation.navigate(screenName);
    } else {
      Alert.alert(
        "Không có quyền truy cập",
        "Chỉ quản trị viên mới có thể truy cập tính năng này."
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="person-circle" size={80} color="#f50" />
        <Text style={styles.title}>Thông tin tài khoản</Text>
      </View>

      {user ? (
        <View style={styles.content}>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tên người dùng:</Text>
              <Text style={styles.infoValue}>
                {user.username || user.fullName || "Chưa cập nhật"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Vai trò:</Text>
              <Text style={[styles.infoValue, styles.roleTag]}>
                {user.role === "Admin"
                  ? "Quản trị viên"
                  : user.role === "Customer"
                  ? "Khách hàng"
                  : user.role === "Staff"
                  ? "Nhân viên"
                  : user.role || "Không xác định"}
              </Text>
            </View>

            {user.phone && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Số điện thoại:</Text>
                <Text style={styles.infoValue}>{user.phone}</Text>
              </View>
            )}
          </View>

          {/* Hiển thị menu quản trị nếu là admin */}
          {isAdmin() && (
            <View style={styles.adminSection}>
              <View style={styles.adminHeader}>
                <Ionicons name="shield-checkmark" size={24} color="#1565C0" />
                <Text style={styles.adminTitle}>Quản lý hệ thống</Text>
              </View>

              <TouchableOpacity
                style={styles.adminButton}
                onPress={() => navigateToAdminScreen("ProductManager")}
              >
                <Ionicons name="fast-food" size={24} color="white" />
                <Text style={styles.adminButtonText}>Quản lý sản phẩm</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.adminButton}
                onPress={() => navigateToAdminScreen("OrderManager")}
              >
                <Ionicons name="receipt" size={24} color="white" />
                <Text style={styles.adminButtonText}>Quản lý đơn hàng</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.adminButton}
                onPress={() => navigateToAdminScreen("CategoryManager")}
              >
                <Ionicons name="list" size={24} color="white" />
                <Text style={styles.adminButtonText}>Quản lý danh mục</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Ionicons name="log-out" size={20} color="white" />
            <Text style={styles.logoutButtonText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  header: {
    alignItems: "center",
    padding: 20,
    paddingTop: 40,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
    color: "#333",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
    maxWidth: "60%",
    textAlign: "right",
  },
  roleTag: {
    color: "#1565C0",
    fontWeight: "bold",
  },
  adminSection: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  adminHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  adminTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
    color: "#1565C0",
  },
  adminButton: {
    backgroundColor: "#1976D2",
    padding: 14,
    borderRadius: 8,
    marginVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  adminButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 12,
  },
  logoutButton: {
    backgroundColor: "#f50",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  logoutButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
});

export default ProfileScreen;
