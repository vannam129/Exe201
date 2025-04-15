import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Input, Button } from "react-native-elements";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { RegisterRequest } from "../types";
import { RootStackParamList } from "../navigators/AppNavigator";

const RegisterScreen = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { register, isLoading, error } = useAuth();

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (!fullName || !email || !phone || !password) {
      Alert.alert("Error", "All fields are required");
      return;
    }

    try {
      await register(fullName, email, phone, password);

      if (!error) {
        Alert.alert(
          "Registration Successful",
          "Please check your email for a confirmation token. You need to confirm your email to activate your account.",
          [
            {
              text: "Later",
              style: "cancel",
              onPress: () => navigation.navigate("Login" as never),
            },
            {
              text: "Confirm Email Now",
              onPress: () => {
                navigation.navigate("EmailConfirm", { email });
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("Registration error:", error);
      Alert.alert("Error", "Network error, please try again");
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
        />

        <Input
          placeholder="Phone"
          value={phone}
          onChangeText={setPhone}
          leftIcon={{
            type: "font-awesome",
            name: "phone",
            color: "#8CC63F",
          }}
          containerStyle={styles.inputContainer}
          keyboardType="phone-pad"
        />

        <Input
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          leftIcon={{ type: "font-awesome", name: "lock", color: "#8CC63F" }}
          secureTextEntry
          containerStyle={styles.inputContainer}
        />

        <Input
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          leftIcon={{ type: "font-awesome", name: "lock", color: "#8CC63F" }}
          secureTextEntry
          containerStyle={styles.inputContainer}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Button
          title="Register"
          buttonStyle={styles.registerButton}
          onPress={handleRegister}
          loading={isLoading}
          disabled={isLoading}
        />

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Login" as never)}
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
  errorText: {
    color: "red",
    marginBottom: 10,
    textAlign: "center",
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
