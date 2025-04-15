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
  isAdmin: () => boolean;
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
    console.log("AuthContext: Bắt đầu lấy userId");

    // Ưu tiên lấy từ state hiện tại
    if (user) {
      const userId = user.id || user.userId;
      console.log("AuthContext: userId từ state user:", userId);

      if (userId && userId !== "unknown" && userId !== "") {
        console.log("AuthContext: Trả về userId từ state:", userId);
        return userId.toString();
      }
    } else {
      console.log("AuthContext: Không có user trong state");
    }

    // Nếu không có trong state, lấy từ AsyncStorage
    try {
      const userData = await AsyncStorage.getItem("user_data");
      console.log(
        "AuthContext: User data từ AsyncStorage:",
        userData ? "Có dữ liệu" : "Không có dữ liệu"
      );

      if (userData) {
        const parsedUser = JSON.parse(userData);
        console.log(
          "AuthContext: Parsed user data:",
          JSON.stringify(parsedUser, null, 2)
        );

        if (parsedUser) {
          const userId = parsedUser.id || parsedUser.userId;

          if (userId && userId !== "unknown" && userId !== "") {
            console.log("AuthContext: Trả về userId từ AsyncStorage:", userId);
            return userId.toString();
          }
        }
      }
    } catch (error) {
      console.error(
        "AuthContext: Lỗi khi đọc user_data từ AsyncStorage:",
        error
      );
    }

    // Nếu không tìm thấy userId hợp lệ, ném lỗi
    console.error(
      "AuthContext: Không tìm thấy userId hợp lệ, cần đăng nhập lại"
    );
    throw new Error("Không tìm thấy thông tin người dùng hợp lệ");
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("AuthContext: Bắt đầu đăng nhập với email:", email);

      // Bước 1: Đăng nhập
      const loginResponse = await api.login(email, password);
      console.log(
        "AuthContext: Kết quả đăng nhập từ API:",
        JSON.stringify(loginResponse.data, null, 2)
      );

      // Bước 2: Lưu token
      const token = loginResponse.data.token;
      await AsyncStorage.setItem("auth_token", token);
      console.log("AuthContext: Đã lưu token");

      // Bước 3: Lấy thông tin người dùng từ API
      const userId = loginResponse.data.userId;
      console.log("AuthContext: userId từ API:", userId);

      // Đảm bảo đã nhận được userId từ API
      if (!userId) {
        console.error("AuthContext: Không nhận được userId từ API");
        throw new Error(
          "Thông tin đăng nhập không hợp lệ. API không trả về userId."
        );
      }

      // Lưu thông tin user từ API
      const userData = {
        id: userId,
        userId: userId,
        email: email,
        username: loginResponse.data.fullName || email.split("@")[0],
        fullName: loginResponse.data.fullName || "",
        role: loginResponse.data.role || "customer",
      };

      console.log(
        "AuthContext: Lưu thông tin người dùng từ API:\n",
        JSON.stringify(userData, null, 2)
      );
      await AsyncStorage.setItem("user_data", JSON.stringify(userData));
      setUser(userData);

      setIsAuthenticated(true);
      console.log(
        "AuthContext: Đăng nhập thành công, đã thiết lập isAuthenticated = true"
      );

      // Kiểm tra xác nhận dữ liệu đã lưu
      try {
        const savedUserData = await AsyncStorage.getItem("user_data");
        if (savedUserData) {
          console.log(
            "AuthContext: Xác nhận - Đã lưu user_data thành công:",
            JSON.stringify(JSON.parse(savedUserData), null, 2)
          );
        }
      } catch (e) {
        console.error("AuthContext: Lỗi khi kiểm tra user_data đã lưu:", e);
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
      const response = await api.register({
        email,
        password,
        phone,
        fullName,
      });
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

  // Thêm hàm isAdmin để kiểm tra vai trò hiện tại
  const isAdmin = (): boolean => {
    if (!user) return false;
    // Kiểm tra cả "admin" và "Admin" để không phân biệt chữ hoa/thường
    return user.role?.toLowerCase() === "admin";
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
        isAdmin,
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
