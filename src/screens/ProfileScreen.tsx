import React from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import { useAuth } from "../contexts/AuthContext";

const ProfileScreen = () => {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      {user ? (
        <>
          <Text style={styles.userInfo}>Username: {user.username}</Text>
          <Text style={styles.userInfo}>Email: {user.email}</Text>
          <View style={styles.buttonContainer}>
            <Button title="Logout" onPress={logout} color="#f50" />
          </View>
        </>
      ) : (
        <Text>Loading user information...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 32,
  },
  userInfo: {
    fontSize: 16,
    marginBottom: 16,
  },
  buttonContainer: {
    marginTop: 32,
    width: "100%",
    maxWidth: 200,
  },
});

export default ProfileScreen;
