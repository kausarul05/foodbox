export interface UserProfile {
  fullName: string;
  phoneNumber: string;
  zone: string;
  address: string;
  walletBalance: number;
  package: string | null;
  isSubscribed: boolean;
}

export interface Order {
  id: string;
  date: string;
  items: string[];
  total: number;
  status: 'pending' | 'delivered' | 'cancelled';
}