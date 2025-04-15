import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Input, Button } from "react-native-elements";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigators/AppNavigator";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

type LoginScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Login"
>;

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { login, isLoading, error } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập email và mật khẩu");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("Attempting to login with:", email);
      await login(email, password);

      // Log thông tin người dùng sau khi đăng nhập thành công
      const userData = await AsyncStorage.getItem("user_data");
      console.log("Login successful. User data stored:", userData);

      // Không cần navigate vì AppNavigator sẽ tự động chuyển sang MainTabs khi isAuthenticated là true
    } catch (error: any) {
      setError(error.message || "Đăng nhập thất bại");
      console.error("Login error:", error);

      let errorMessage = "Đăng nhập thất bại";
      if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Lỗi đăng nhập", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Food Order App</Text>
        <Text style={styles.subtitle}>Login to your account</Text>
      </View>

      <View style={styles.form}>
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
        />
        <Input
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          leftIcon={{ type: "font-awesome", name: "lock", color: "#8CC63F" }}
          secureTextEntry
          containerStyle={styles.inputContainer}
        />

        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

        <Button
          title="Login"
          buttonStyle={styles.loginButton}
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
        />

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Register" as never)}
          >
            <Text style={styles.registerLink}>Register</Text>
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
    marginBottom: 50,
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
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: "#8CC63F",
    height: 50,
    borderRadius: 5,
    marginTop: 10,
  },
  errorText: {
    color: "red",
    marginBottom: 10,
    textAlign: "center",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  registerText: {
    color: "#666",
  },
  registerLink: {
    color: "#8CC63F",
    fontWeight: "bold",
  },
});

export default LoginScreen;
