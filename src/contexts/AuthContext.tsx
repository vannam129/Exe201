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
  ) => Promise<{ success: boolean; message: string }>;
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

  // Kiểm tra token đã tồn tại khi khởi động
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
        console.error("Lỗi khi tải trạng thái xác thực", error);
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
      const errorMessage = error.message || "Đăng nhập thất bại";
      console.error("Lỗi đăng nhập trong AuthContext:", errorMessage, error);
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
      console.log("AuthContext: Gọi API đăng ký cho", email);
      const response = await api.register({
        email,
        password,
        phone,
        fullName,
      });
      console.log("AuthContext: Nhận phản hồi đăng ký", response);

      // Trả về kết quả thành công mà không đăng nhập tự động
      // Yêu cầu người dùng xác thực email trước khi đăng nhập
      return {
        success: true,
        message:
          "Đăng ký thành công! Vui lòng xác thực email trước khi đăng nhập.",
      };
    } catch (error: any) {
      const errorMessage = error.message || "Đăng ký thất bại";
      console.error("Lỗi đăng ký trong AuthContext:", errorMessage, error);
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
      console.error("Lỗi đăng xuất", error);
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
    throw new Error("useAuth phải được sử dụng trong AuthProvider");
  }
  return context;
};

export default AuthContext;
