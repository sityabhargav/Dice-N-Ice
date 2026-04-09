import { MenuItem, Flavour, Topping } from './types';

export const MENU: MenuItem[] = [
  { id: 'affogato', name: 'Affogato', sub: 'Ice cream me dooba pyaar', price: 99, emoji: '🍦', n: '01', viral: false },
  { id: 'brownie', name: 'Brownie Ice Cream', sub: 'Ek se kaam nahi chalega', price: 119, emoji: '🍫', n: '02', viral: false },
  { id: 'classic', name: 'Classic', sub: 'Ghar jesa', price: 119, emoji: '☕', n: '03', viral: false },
  { id: 'viet', name: 'Vietnamese Iced Coffee', sub: 'Not your usual coffee', price: 139, emoji: '🥤', n: '04', viral: false },
  { id: 'frappe', name: 'Frappe', sub: 'Lassi ka angrezi bhai', price: 149, emoji: '🧋', n: '05', viral: false },
  { id: 'oec', name: 'Orange Coke Espresso', sub: 'Unexpectedly Purrfect', price: 149, emoji: '🍊', n: '06', viral: true }
];

export const FLAVOURS: Flavour[] = [
  { label: 'Classic', dot: '#C8A06E' },
  { label: 'Hazelnut', dot: '#7B4220' },
  { label: 'Vanilla', dot: '#F3D9C0' },
  { label: 'Chocolate', dot: '#2C1205' }
];

export const TOPPINGS: Topping[] = [
  { emoji: '🍫', name: 'Choco chips', dice: '⚀ Roll 1' },
  { emoji: '☁️', name: 'Marshmallows', dice: '⚁ Roll 2' },
  { emoji: '🟫', name: 'Brownies', dice: '⚂ Roll 3' },
  { emoji: '🍪', name: 'Cookies', dice: '⚃ Roll 4' },
  { emoji: '🍫', name: 'Choco rolls', dice: '⚄ Roll 5' },
  { emoji: '🎂', name: 'Choco treats', dice: '⚅ Roll 6' }
];

export const OWNER_PIN = '1234';
export const STALL_WA = '917016087072';
export const UPI_ID = '7016087072@ybl';
