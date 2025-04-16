import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Input, Button } from "react-native-elements";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import { RootStackParamList } from "../navigators/AppNavigator";

const RegisterScreen = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const validateInputs = () => {
    if (!fullName || !email || !phone || !password) {
      Alert.alert("Error", "All fields are required");
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return false;
    }

    // Validate phone format (simple check for numbers only)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      Alert.alert("Error", "Please enter a valid 10-digit phone number");
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateInputs()) return;

    setIsLoading(true);
    try {
      // Call register API
      await api.register({
        fullName,
        email,
        password,
        phone,
      });

      // Show success message and navigate to email confirmation
      Alert.alert(
        "Đăng ký thành công",
        "Chúng tôi đã gửi mã xác nhận đến email của bạn. Vui lòng kiểm tra hộp thư đến và thư rác.",
        [
          {
            text: "Xác thực ngay",
            onPress: () => {
              navigation.navigate("EmailConfirm", { email });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("Registration error:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Đăng ký thất bại. Vui lòng thử lại sau.";
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Food Order App</Text>
        <Text style={styles.subtitle}>Create a new account</Text>
      </View>

      <View style={styles.form}>
        <Input
          placeholder="Full Name"
          value={fullName}
          onChangeText={setFullName}
          leftIcon={{ type: "font-awesome", name: "user", color: "#8CC63F" }}
          containerStyle={styles.inputContainer}
          autoCapitalize="words"
          disabled={isLoading}
        />

        <Input
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          leftIcon={{
            type: "font-awesome",
            name: "envelope",
            color: "#8CC63F",
          }}
          containerStyle={styles.inputContainer}
          autoCapitalize="none"
          keyboardType="email-address"
          disabled={isLoading}
        />

        <Input
          placeholder="Phone (10 digits)"
          value={phone}
          onChangeText={setPhone}
          leftIcon={{ type: "font-awesome", name: "phone", color: "#8CC63F" }}
          containerStyle={styles.inputContainer}
          keyboardType="phone-pad"
          disabled={isLoading}
          maxLength={10}
        />

        <Input
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          leftIcon={{ type: "font-awesome", name: "lock", color: "#8CC63F" }}
          secureTextEntry
          containerStyle={styles.inputContainer}
          disabled={isLoading}
        />

        <Input
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          leftIcon={{ type: "font-awesome", name: "lock", color: "#8CC63F" }}
          secureTextEntry
          containerStyle={styles.inputContainer}
          disabled={isLoading}
        />

        <Button
          title={isLoading ? "Creating Account..." : "Register"}
          buttonStyle={styles.registerButton}
          onPress={handleRegister}
          loading={isLoading}
          disabled={isLoading}
        />

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Login" as never)}
            disabled={isLoading}
          >
            <Text style={styles.loginLink}>Login</Text>
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
    marginBottom: 30,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#8CC63F",
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
    marginTop: 10,
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 15,
  },
  registerButton: {
    backgroundColor: "#8CC63F",
    height: 50,
    borderRadius: 5,
    marginTop: 10,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  loginText: {
    color: "#666",
  },
  loginLink: {
    color: "#8CC63F",
    fontWeight: "bold",
  },
});

export default RegisterScreen;
