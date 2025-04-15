import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/contexts/AuthContext";
import AppNavigator from "./src/navigators/AppNavigator";
import { navigationRef } from "./src/navigators/AppNavigator";
import { useEffect } from "react";
import { Linking } from "react-native";

export default function App() {
  // Xử lý mở liên kết từ bên ngoài
  useEffect(() => {
    // Khi ứng dụng đang chạy và nhận được URL
    const handleUrl = (event: { url: string }) => {
      let { url } = event;
      handleDeepLink(url);
    };

    // Đăng ký lắng nghe sự kiện URL
    Linking.addEventListener("url", handleUrl);

    // Kiểm tra nếu ứng dụng được mở từ URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Cleanup listener khi component unmount
    return () => {
      // Linking.removeEventListener('url', handleUrl); // Deprecated trong React Native mới
    };
  }, []);

  // Hàm xử lý deep link
  const handleDeepLink = (url: string) => {
    // Xử lý URL xác nhận email
    if (url && url.includes("/confirm-email")) {
      const token = url.split("token=")[1];
      if (token) {
        // Truyền token đến màn hình xác nhận email nếu navigation đã sẵn sàng
        if (navigationRef.isReady()) {
          navigationRef.navigate("EmailConfirm", { token });
        }
      }
    }
  };

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <View style={styles.container}>
          <StatusBar style="auto" />
          <AppNavigator />
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
