export interface Package {
  id: string;
  name: 'golden' | 'diamond';
  title: string;
  price: number;
  originalPrice: number;
  features: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface WeeklyMenu {
  id: string;
  day: string;
  morning: string;
  lunch: string;
  dinner: string;
  package: 'golden' | 'diamond';
  price: number;
  isActive: boolean;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  phoneNumber: string;
  package: string;
  items: string[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled';
  orderDate: Date;
  deliveryDate: Date;
  address: string;
  zone: string;
}

export interface Subscriber {
  id: string;
  userId: string;
  userName: string;
  phoneNumber: string;
  email: string;
  package: 'golden' | 'diamond';
  startDate: Date;
  endDate: Date;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
  totalAmount: number;
  address: string;
  zone: string;
}

export interface AdminStats {
  totalOrders: number;
  totalRevenue: number;
  activeSubscribers: number;
  pendingSubscribers: number;
  totalUsers: number;
  monthlyGrowth: number;
}