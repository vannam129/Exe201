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
import { useNavigation, useRoute } from "@react-navigation/native";
import api from "../services/api";

type RouteParams = {
  email?: string;
  token?: string;
};

const EmailConfirmScreen = () => {
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();

  // Lấy token từ route params nếu có
  useEffect(() => {
    const params = route.params as RouteParams;
    if (params?.token) {
      setToken(params.token);
      handleConfirm(params.token);
    }
  }, [route.params]);

  const handleConfirm = async (confirmToken: string) => {
    if (!confirmToken.trim()) {
      Alert.alert("Error", "Please enter the confirmation token");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.confirmEmail(confirmToken);

      if (response.status === 200) {
        setIsConfirmed(true);
        Alert.alert("Success", "Your email has been confirmed successfully", [
          {
            text: "Go to Login",
            onPress: () => navigation.navigate("Login" as never),
          },
        ]);
      } else {
        Alert.alert("Error", "Invalid or expired token");
      }
    } catch (error: any) {
      console.error("Email confirmation error:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to confirm email";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const openMailApp = () => {
    Linking.openURL("mailto:");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Email Confirmation</Text>
        <Text style={styles.subtitle}>
          Please enter the confirmation token sent to your email
        </Text>
      </View>

      <View style={styles.form}>
        <Input
          placeholder="Confirmation Token"
          value={token}
          onChangeText={setToken}
          leftIcon={{ type: "font-awesome", name: "key", color: "#f50" }}
          containerStyle={styles.inputContainer}
          disabled={isLoading || isConfirmed}
        />

        <Button
          title={isLoading ? "Confirming..." : "Confirm Email"}
          buttonStyle={styles.confirmButton}
          onPress={() => handleConfirm(token)}
          loading={isLoading}
          disabled={isLoading || isConfirmed || !token.trim()}
        />

        {!isConfirmed && (
          <TouchableOpacity style={styles.openMailButton} onPress={openMailApp}>
            <Text style={styles.openMailText}>Open Email App</Text>
          </TouchableOpacity>
        )}

        {isConfirmed && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>
              Email confirmed successfully!
            </Text>
            <Button
              title="Go to Login"
              buttonStyle={styles.loginButton}
              onPress={() => navigation.navigate("Login" as never)}
            />
          </View>
        )}

        <View style={styles.linkContainer}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Login" as never)}
          >
            <Text style={styles.linkText}>Back to Login</Text>
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
    color: "#f50",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 20,
  },
  confirmButton: {
    backgroundColor: "#f50",
    height: 50,
    borderRadius: 5,
    marginBottom: 20,
  },
  openMailButton: {
    alignItems: "center",
    padding: 15,
    marginBottom: 20,
  },
  openMailText: {
    color: "#f50",
    fontWeight: "bold",
    fontSize: 16,
  },
  linkContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  linkText: {
    color: "#999",
    fontSize: 16,
  },
  successContainer: {
    alignItems: "center",
    marginTop: 20,
    padding: 20,
    backgroundColor: "#f0f8ff",
    borderRadius: 10,
  },
  successText: {
    color: "green",
    fontSize: 18,
    marginBottom: 20,
    fontWeight: "bold",
  },
  loginButton: {
    backgroundColor: "#4CAF50",
    width: 150,
    height: 40,
    borderRadius: 5,
  },
});

export default EmailConfirmScreen;
