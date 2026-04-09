export interface MenuItem {
  id: string;
  name: string;
  sub: string;
  price: number;
  emoji: string;
  n: string;
  viral: boolean;
}

export interface Flavour {
  label: string;
  dot: string;
}

export interface Topping {
  emoji: string;
  name: string;
  dice: string;
}

export interface CartItem {
  key: string;
  id: string;
  name: string;
  price: number;
  qty: number;
  flv: string | null;
  emoji: string;
}

export interface Order {
  id: string;
  name: string;
  phone: string;
  note: string;
  payMethod: 'counter' | 'upi';
  utr: string;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'done';
  items: {
    name: string;
    emoji: string;
    qty: number;
    price: number;
    flv: string | null;
  }[];
  date: string;
  time: string;
}
