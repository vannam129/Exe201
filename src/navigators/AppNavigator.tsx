import React from "react";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";

// Tạo navigationRef để có thể điều hướng từ bên ngoài component
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Import screens
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import EmailConfirmScreen from "../screens/EmailConfirmScreen";
import HomeScreen from "../screens/HomeScreen";
import MenuScreen from "../screens/MenuScreen";
import CartScreen from "../screens/CartScreen";
import OrdersScreen from "../screens/OrdersScreen";
import ProfileScreen from "../screens/ProfileScreen";
// import OrderDetailScreen from "../screens/OrderDetailScreen";
import OrderManagerScreen from "../screens/OrderManagerScreen";
import ProductManagerScreen from "../screens/ProductManagerScreen";
import CategoryManagerScreen from "../screens/CategoryManagerScreen";

// Create navigator types
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  EmailConfirm: { token?: string; email?: string };
  Home: undefined;
  Menu: { category?: string; categoryId?: string | number };
  Cart: undefined;
  Orders: undefined;
  OrderDetails: { orderId: string };
  Profile: undefined;
  OrderDetail: { orderId: string };
  OrderManager: undefined;
  ProductManager: undefined;
  CategoryManager: undefined;
  MainTabs: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootStackParamList>();

const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="EmailConfirm" component={EmailConfirmScreen} />
    </Stack.Navigator>
  );
};

const MainTabs = () => {
  const { isAdmin } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Menu") {
            iconName = focused ? "restaurant" : "restaurant-outline";
          } else if (route.name === "Cart") {
            iconName = focused ? "cart" : "cart-outline";
          } else if (route.name === "Orders") {
            iconName = focused ? "list" : "list-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#f50",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{ headerShown: false }}
      />
      {!isAdmin() && (
        <Tab.Screen
          name="Cart"
          component={CartScreen}
          options={{ headerShown: false }}
        />
      )}
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
};

const RootStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerStyle: {
          backgroundColor: "#f50",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OrderDetails"
        component={OrdersScreen}
        options={{ title: "Chi tiết đơn hàng" }}
      />
      <Stack.Screen
        name="OrderManager"
        component={OrderManagerScreen}
        options={{ title: "Quản lý đơn hàng" }}
      />
      <Stack.Screen
        name="ProductManager"
        component={ProductManagerScreen}
        options={{ title: "Quản lý sản phẩm" }}
      />
      <Stack.Screen
        name="CategoryManager"
        component={CategoryManagerScreen}
        options={{ title: "Quản lý danh mục" }}
      />
    </Stack.Navigator>
  );
};

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // You can return a loading screen here
    return null;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {isAuthenticated ? <RootStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;
