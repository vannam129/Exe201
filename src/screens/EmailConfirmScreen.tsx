import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Input, Button } from "react-native-elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigators/AppNavigator";
import api from "../services/api";

type EmailConfirmScreenRouteProp = RouteProp<
  RootStackParamList,
  "EmailConfirm"
>;

const EmailConfirmScreen = () => {
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const navigation = useNavigation();
  const route = useRoute<EmailConfirmScreenRouteProp>();
  const email = route.params?.email;

  const handleConfirm = async () => {
    if (!token.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập mã xác nhận");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.confirmEmail(token);
      console.log("Confirmation response:", response);

      setIsConfirmed(true);
      Alert.alert(
        "Thành công",
        "Email của bạn đã được xác nhận thành công! Bạn có thể đăng nhập ngay bây giờ.",
        [
          {
            text: "Đăng nhập",
            onPress: () => navigation.navigate("Login" as never),
          },
        ]
      );
    } catch (error: any) {
      console.error("Email confirmation error:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Mã xác nhận không hợp lệ hoặc đã hết hạn";
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      Alert.alert("Lỗi", "Thiếu địa chỉ email");
      return;
    }

    setIsResending(true);
    try {
      await api.resendConfirmationCode(email);
      Alert.alert(
        "Thành công",
        "Một mã xác nhận mới đã được gửi đến email của bạn"
      );
    } catch (error: any) {
      console.error("Resend code error:", error);
      const errorMessage =
        error.response?.data?.message || "Không thể gửi lại mã xác nhận";
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const openMailApp = () => {
    Linking.openURL("mailto:");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Xác Nhận Email</Text>
        <Text style={styles.subtitle}>
          Vui lòng nhập mã xác nhận đã được gửi đến:
        </Text>
        <Text style={styles.emailText}>{email}</Text>
      </View>

      <View style={styles.form}>
        <Input
          placeholder="Nhập mã xác nhận"
          value={token}
          onChangeText={setToken}
          leftIcon={{ type: "font-awesome", name: "key", color: "#8CC63F" }}
          containerStyle={styles.inputContainer}
          keyboardType="default"
          disabled={isLoading || isConfirmed}
        />

        <Button
          title={isLoading ? "Đang xác thực..." : "Xác Thực Email"}
          buttonStyle={[styles.button, styles.verifyButton]}
          onPress={handleConfirm}
          loading={isLoading}
          disabled={isLoading || isConfirmed || !token.trim()}
        />

        {!isConfirmed && (
          <>
            <Button
              title={isResending ? "Đang gửi lại..." : "Gửi Lại Mã"}
              type="outline"
              buttonStyle={styles.button}
              titleStyle={{ color: "#8CC63F" }}
              onPress={handleResendCode}
              loading={isResending}
              disabled={isResending || isLoading}
            />

            <TouchableOpacity
              style={styles.openMailButton}
              onPress={openMailApp}
              disabled={isLoading || isResending}
            >
              <Text style={styles.openMailText}>Mở Ứng Dụng Email</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.linkContainer}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Login" as never)}
            disabled={isLoading || isResending}
          >
            <Text style={styles.linkText}>Quay Lại Đăng Nhập</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  header: {
    marginTop: 50,
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#8CC63F",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 5,
  },
  emailText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "bold",
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 20,
  },
  button: {
    height: 50,
    borderRadius: 5,
    marginBottom: 15,
    borderColor: "#8CC63F",
  },
  verifyButton: {
    backgroundColor: "#8CC63F",
  },
  openMailButton: {
    alignItems: "center",
    padding: 15,
  },
  openMailText: {
    color: "#8CC63F",
    fontWeight: "bold",
    fontSize: 16,
  },
  linkContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  linkText: {
    color: "#666",
    fontSize: 16,
  },
});

export default EmailConfirmScreen;
