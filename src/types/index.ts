// Common types used throughout the app

export interface Category {
  id: string | number;
  name: string;
  description?: string;
  imageUrl?: string;
}

export interface MenuItem {
  id: number | string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  category: string;
  categoryId?: number | string;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  imageURL?: string;
}

// Interface cho sản phẩm trong giỏ hàng trả về từ API
export interface CartProduct {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  imageURL?: string;
}

export interface Order {
  id: number;
  userId: number;
  items: OrderItem[];
  totalAmount: number;
  status: string;
  createdAt: string;
  deliveryAddress?: string;
}

// Interface cho đơn hàng trả về từ API
export interface OrderResponse {
  orderId: string;
  userId: string;
  consigneeName: string;
  deliverAddress: string;
  phoneNumber: string;
  deliveryId: string;
  orderStatus: string;
  orderDate: string;
  orderDetails: OrderDetailResponse[];
  totalAmount: number;
}

// Interface cho chi tiết đơn hàng trả về từ API
export interface OrderDetailResponse {
  orderDetailId: string;
  orderId: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  imageURL?: string;
}

export interface OrderItem {
  menuItemId: number;
  name: string;
  quantity: number;
  price: number;
}

export interface User {
  id: number | string;
  userId?: string;
  username?: string;
  fullName?: string;
  email: string;
  phone?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface CartState {
  items: CartItem[];
  totalAmount: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  phone: string;
  fullName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
} 