import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../types";
import api from "../services/api";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    fullName: string,
    email: string,
    phone: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  getUserId: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing token on startup
  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem("auth_token");
        const userData = await AsyncStorage.getItem("user_data");

        if (token && userData) {
          setUser(JSON.parse(userData));
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Error loading auth state", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkToken();
  }, []);

  // Hàm lấy userId từ thông tin đăng nhập đã lưu
  const getUserId = async (): Promise<string> => {
    // Ưu tiên lấy từ state hiện tại
    if (user) {
      const userId = user.id || user.userId;
      if (userId) {
        return userId.toString();
      }
    }

    // Nếu không có trong state, lấy từ AsyncStorage
    const userData = await AsyncStorage.getItem("user_data");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      if (parsedUser && (parsedUser.id || parsedUser.userId)) {
        return (parsedUser.id || parsedUser.userId).toString();
      }
    }

    throw new Error("Không tìm thấy thông tin người dùng");
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("AuthContext: Calling login API for", email);
      const response = await api.login(email, password);
      console.log("AuthContext: Login response received", response);

      // Kiểm tra dữ liệu trả về để tránh lỗi undefined
      if (response && response.data) {
        // Log data để debug
        console.log("Raw response data:", JSON.stringify(response.data));

        // Xử lý response.data với any type để tránh lỗi
        const responseData: any = response.data;

        // Tạo đối tượng người dùng
        const userData: User = {
          id: responseData.user?.id || responseData.userId || 0,
          userId: responseData.user?.userId || responseData.userId,
          email: responseData.user?.email || responseData.email || "",
          username: responseData.user?.username || responseData.fullName || "",
          fullName: responseData.user?.fullName || responseData.fullName || "",
          phone: responseData.user?.phone || responseData.phone || "",
        };

        // Lưu vào AsyncStorage
        await AsyncStorage.setItem("auth_token", responseData.token);
        await AsyncStorage.setItem("user_data", JSON.stringify(userData));

        // Cập nhật state
        setUser(userData);
        setIsAuthenticated(true);
        console.log(
          "Login successful:",
          userData.email,
          "with ID:",
          userData.id
        );
      } else {
        console.error("Invalid response structure:", response);
        throw new Error("Invalid response data");
      }
    } catch (error: any) {
      const errorMessage = error.message || "Login failed";
      console.error("Login error in AuthContext:", errorMessage, error);
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    fullName: string,
    email: string,
    phone: string,
    password: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("AuthContext: Calling register API for", email);
      const response = await api.register(email, password, phone, fullName);
      console.log("AuthContext: Register response received", response);

      // Kiểm tra dữ liệu trả về
      if (response && response.data) {
        let token = "";
        let userData: User | null = null;

        // Extract token and user data from response
        if (response.data.token) {
          token = response.data.token;
          userData = response.data.user || {
            id: 0,
            email: email,
            username: fullName,
            fullName: fullName,
            phone: phone,
          };
        }

        if (!token) {
          console.error("Token not found in register response");
          throw new Error("Registration successful but login required");
        }

        // Đảm bảo user có dữ liệu cơ bản
        if (!userData) {
          userData = {
            id: 0,
            email: email,
            username: fullName,
            fullName: fullName,
            phone: phone,
          };
        }

        // Save authentication data
        await AsyncStorage.setItem("auth_token", token);
        await AsyncStorage.setItem("user_data", JSON.stringify(userData));

        // Update app state
        setUser(userData);
        setIsAuthenticated(true);
        console.log("Registration successful:", userData.email);
      } else {
        console.error("Invalid register response structure:", response);
        throw new Error("Invalid response data");
      }
    } catch (error: any) {
      const errorMessage = error.message || "Registration failed";
      console.error("Register error in AuthContext:", errorMessage, error);
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("auth_token");
      await AsyncStorage.removeItem("user_data");

      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        error,
        getUserId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
