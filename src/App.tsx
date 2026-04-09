import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Menu as MenuIcon, 
  Star, 
  ShoppingCart, 
  ChevronRight, 
  Plus, 
  Minus, 
  Trash2, 
  Check, 
  Instagram, 
  Printer,
  X,
  ArrowRight,
  Copy,
  Coffee,
  Dice5,
  LayoutDashboard,
  LogOut,
  MessageCircle
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc, 
  doc, 
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { db, auth } from './firebase';
import { MENU, FLAVOURS, TOPPINGS, STALL_WA, UPI_ID } from './constants';
import { MenuItem, CartItem, Order } from './types';

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorInfo: '' };
    this.props = props;
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.errorInfo);
        if (parsed.error && parsed.error.includes('permission')) {
          displayMessage = "You don't have permission to perform this action.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-espresso flex items-center justify-center p-6 text-center">
          <div className="bg-card border-2 border-rust rounded-2xl p-8 max-w-sm">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="font-display text-2xl font-bold text-brown uppercase mb-2">Oops!</h2>
            <p className="text-sm text-mocha mb-6">{displayMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-brown text-cream px-6 py-2 rounded-md font-display text-xs font-bold uppercase tracking-widest"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const Toast = ({ message, show }: { message: string, show: boolean }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ y: 20, x: '-50%', opacity: 0 }}
        animate={{ y: 0, x: '-50%', opacity: 1 }}
        exit={{ y: 20, x: '-50%', opacity: 0 }}
        className="fixed bottom-20 left-1/2 z-[9999] bg-cream text-brown border border-gold px-5 py-2 rounded-md font-display text-xs font-semibold uppercase tracking-wider whitespace-nowrap shadow-xl no-print"
      >
        {message}
      </motion.div>
    )}
  </AnimatePresence>
);

const PrintableMenu = () => (
  <div className="print-only p-8 bg-white text-black font-sans">
    <div className="text-center mb-10 border-b-2 border-black pb-6">
      <h1 className="font-display text-5xl font-bold uppercase tracking-tighter mb-2">Dice N' Ice</h1>
      <p className="font-handwriting text-2xl">Cold Coffee & Good Vibes</p>
    </div>

    <div className="grid grid-cols-2 gap-12">
      <div>
        <h2 className="font-display text-3xl font-bold uppercase border-b-2 border-black mb-6 pb-2">The Menu</h2>
        <div className="space-y-6">
          {MENU.map(item => (
            <div key={item.id} className="flex justify-between items-start">
              <div>
                <h3 className="font-display text-xl font-bold uppercase">{item.emoji} {item.name}</h3>
                <p className="text-sm italic text-gray-600">{item.sub}</p>
              </div>
              <span className="font-serif text-xl font-bold">₹{item.price}</span>
            </div>
          ))}
        </div>
        <div className="mt-8 p-4 border-2 border-dashed border-black rounded-lg">
          <h4 className="font-display text-lg font-bold uppercase mb-2">Available Flavours</h4>
          <p className="text-sm">Classic, Hazelnut, Vanilla, Chocolate</p>
        </div>
      </div>

      <div>
        <h2 className="font-display text-3xl font-bold uppercase border-b-2 border-black mb-6 pb-2">Toppings</h2>
        <p className="text-sm mb-6 italic">Roll the dice at the counter for a chance to win a free topping!</p>
        <div className="grid grid-cols-1 gap-4">
          {TOPPINGS.map(topping => (
            <div key={topping.name} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg">
              <span className="text-2xl">{topping.emoji}</span>
              <div>
                <h3 className="font-display text-lg font-bold uppercase">{topping.name}</h3>
                <p className="text-xs font-bold text-gray-500 uppercase">{topping.dice}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <div className="inline-block p-4 border-2 border-black rounded-full mb-4">
            <Dice5 size={40} />
          </div>
          <p className="font-handwriting text-xl">"Why choose? Let the dice decide!"</p>
        </div>
      </div>
    </div>

    <div className="mt-16 text-center text-xs border-t border-gray-300 pt-6">
      <p>Follow us on Instagram @dice_n._ice</p>
      <p className="mt-1">Fleatopia Coffee Stall · Est. 2025</p>
    </div>
  </div>
);

export default function App() {
  const [activePage, setActivePage] = useState<'home' | 'menu' | 'toppings' | 'cart' | 'checkout' | 'confirm' | 'owner'>('home');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>(
    MENU.reduce((acc, item) => ({ ...acc, [item.id]: 1 }), {})
  );
  const [flavours, setFlavours] = useState<Record<string, string>>(
    MENU.reduce((acc, item) => ({ ...acc, [item.id]: 'Classic' }), {})
  );
  const [toast, setToast] = useState({ show: false, message: '' });
  const [payMethod, setPayMethod] = useState<'counter' | 'upi'>('counter');
  const [checkoutData, setCheckoutData] = useState({ name: '', phone: '', note: '', utr: '' });
  const [lastOrderId, setLastOrderId] = useState('');
  
  // Firebase State
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // --- Effects ---

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activePage === 'owner' && user && user.email === 'sityabhargav@gmail.com') {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const orderData = snapshot.docs.map(doc => ({
          firebaseId: doc.id,
          ...doc.data()
        })) as any[];
        setOrders(orderData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      });
      return () => unsubscribe();
    }
  }, [activePage, user]);

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ ...toast, show: false }), 2200);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // --- Helpers ---

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
      showToast("Login failed");
    }
  };

  const logout = async () => {
    await signOut(auth);
    setActivePage('home');
  };

  const updateOrderStatus = async (orderFirebaseId: string, newStatus: string) => {
    try {
      const orderRef = doc(db, 'orders', orderFirebaseId);
      await updateDoc(orderRef, { status: newStatus });
      showToast(`Order marked as ${newStatus}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderFirebaseId}`);
    }
  };

  const showToast = (message: string) => setToast({ show: true, message });

  const updateQuantity = (id: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, Math.min(9, (prev[id] || 1) + delta))
    }));
  };

  const addToCart = (item: MenuItem) => {
    const qty = quantities[item.id];
    const flv = item.viral ? null : flavours[item.id];
    const key = `${item.id}|${flv || ''}`;

    setCart(prev => {
      const existing = prev.find(i => i.key === key);
      if (existing) {
        return prev.map(i => i.key === key ? { ...i, qty: i.qty + qty } : i);
      }
      return [...prev, {
        key,
        id: item.id,
        name: item.name,
        price: item.price,
        qty,
        flv,
        emoji: item.emoji
      }];
    });

    setQuantities(prev => ({ ...prev, [item.id]: 1 }));
    showToast(`${item.emoji} ${item.name} added!`);
  };

  const removeFromCart = (key: string) => {
    setCart(prev => prev.filter(i => i.key !== key));
  };

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);

  const handleCheckout = async () => {
    if (!checkoutData.name.trim()) return showToast('Please enter your name');
    if (!/^\d{10}$/.test(checkoutData.phone)) return showToast('Enter a valid 10-digit number');
    if (payMethod === 'upi' && !checkoutData.utr.trim()) return showToast('Please enter UTR after paying');

    const orderId = `DNI-${Math.floor(Math.random() * 900) + 100}`;
    setLastOrderId(orderId);
    
    const now = new Date();
    const orderObj = {
      id: orderId,
      name: checkoutData.name,
      phone: checkoutData.phone,
      note: checkoutData.note,
      payMethod,
      utr: checkoutData.utr,
      total: cartTotal,
      status: 'pending',
      items: cart.map(c => ({
        name: c.name,
        emoji: c.emoji,
        qty: c.qty,
        price: c.price,
        flv: c.flv
      })),
      date: now.toLocaleDateString('en-IN'),
      time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'orders'), orderObj);
      
      const itemsText = cart.map(c => `• ${c.name}${c.flv ? ` (${c.flv})` : ''} ×${c.qty} — ₹${c.price * c.qty}`).join('\n');
      const waMsg = `🎲 *NEW ORDER — Dice N' Ice*\n\nOrder: *${orderId}*\nName: ${checkoutData.name}\nPhone: +91${checkoutData.phone}\nPayment: ${payMethod === 'upi' ? `UPI (UTR: ${checkoutData.utr})` : 'Pay at Counter'}${checkoutData.note ? `\nNote: ${checkoutData.note}` : ''}\n\n*Items:*\n${itemsText}\n\n*Total: ₹${cartTotal}*`;

      setActivePage('confirm');
      setCart([]);
      setCheckoutData({ name: '', phone: '', note: '', utr: '' });

      // Open WhatsApp
      setTimeout(() => {
        window.open(`https://wa.me/${STALL_WA}?text=${encodeURIComponent(waMsg)}`, '_blank');
      }, 800);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredOrders = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter(o => o.status === filter);
  }, [orders, filter]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const revenue = orders.filter(o => o.status === 'done').reduce((sum, o) => sum + o.total, 0);
    const pending = orders.filter(o => o.status === 'pending').length;
    return { totalOrders, revenue, pending };
  }, [orders]);

  // --- Renderers ---

  const renderHome = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-20">
      <div className="bg-brown p-10 pt-16 text-center border-b-2 border-dashed border-gold/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_30%,rgba(196,154,60,0.07)_0%,transparent_70%)] pointer-events-none" />
        <motion.span 
          animate={{ y: [0, -8, 0] }} 
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="text-6xl block mb-4"
        >
          🎲
        </motion.span>
        <h1 className="font-display text-5xl font-bold leading-[0.92] tracking-wider uppercase mb-3">
          <span className="text-cream block">Cold Coffee</span>
          <span className="text-gold italic font-serif block text-6xl"> & Good Vibes</span>
        </h1>
        <p className="font-handwriting text-xl text-tan mb-8">"Why choose? Let the dice decide!"</p>
        <button 
          onClick={() => setActivePage('menu')}
          className="inline-flex items-center gap-2 bg-cream text-brown border-2 border-gold rounded-md px-8 py-3 font-display text-base font-semibold uppercase tracking-widest hover:bg-gold transition-colors active:scale-95"
        >
          Order Now ☕
        </button>
        
        <div className="flex justify-center mt-8 border border-gold/30 rounded-lg overflow-hidden w-fit mx-auto">
          <div className="px-5 py-2 text-center">
            <div className="font-display text-2xl font-bold text-gold leading-none">6</div>
            <div className="text-[9px] text-tan font-medium uppercase tracking-wider mt-1">Drinks</div>
          </div>
          <div className="w-px bg-gold/30 my-2" />
          <div className="px-5 py-2 text-center">
            <div className="font-display text-2xl font-bold text-gold leading-none">4</div>
            <div className="text-[9px] text-tan font-medium uppercase tracking-wider mt-1">Flavours</div>
          </div>
          <div className="w-px bg-gold/30 my-2" />
          <div className="px-5 py-2 text-center">
            <div className="font-display text-2xl font-bold text-gold leading-none">6</div>
            <div className="text-[9px] text-tan font-medium uppercase tracking-wider mt-1">Toppings</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 px-5 my-6">
        <div className="flex-1 h-px bg-gold/25" />
        <div className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-gold whitespace-nowrap">Free Topping Offer</div>
        <div className="flex-1 h-px bg-gold/25" />
      </div>

      <div className="mx-4 bg-card border-2 border-dashed border-rust rounded-2xl p-6 text-center relative overflow-hidden">
        <div className="absolute -top-1 right-3 font-display text-5xl font-black text-rust opacity-5 leading-none select-none">FREE</div>
        <div className="inline-block bg-rust text-white font-display text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-sm mb-3">🎲 Exclusive Offer</div>
        <h2 className="font-display text-xl font-bold text-brown uppercase tracking-tight mb-2">Follow + Tag = Free Dice Roll!</h2>
        <p className="text-xs text-mocha leading-relaxed mb-4">Follow <strong>@dice_n._ice</strong> on Instagram and tag us in your story at the stall — get a FREE dice roll for any topping!</p>
        
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-brown/5 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">📱</div>
            <div className="text-[10px] text-mocha font-bold leading-tight">Follow @dice_n._ice</div>
          </div>
          <div className="bg-brown/5 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">📸</div>
            <div className="text-[10px] text-mocha font-bold leading-tight">Tag us in story</div>
          </div>
          <div className="bg-brown/5 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">🎲</div>
            <div className="text-[10px] text-mocha font-bold leading-tight">Roll at counter!</div>
          </div>
        </div>

        <a 
          href="https://www.instagram.com/dice_n._ice?igsh=b2I1dzU4bzN0aTRn" 
          target="_blank" 
          rel="noopener"
          className="inline-flex items-center gap-2 bg-brown text-cream border border-gold rounded-md px-5 py-2.5 font-display text-xs font-semibold uppercase tracking-wider hover:bg-brown-light transition-colors no-underline"
        >
          <Instagram size={14} /> @dice_n._ice
        </a>
      </div>

      <div className="text-center p-6 font-handwriting text-base text-tan opacity-70">
        ✦ Made with luck & love · Est. 2025 ✦
      </div>
    </motion.div>
  );

  const renderMenu = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-24">
      <div className="p-6 pt-8">
        <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold mb-1">Our offerings</div>
        <div className="flex justify-between items-center">
          <h2 className="font-display text-3xl font-bold text-cream uppercase tracking-wider leading-none">The <span className="text-gold italic font-serif">Menu</span></h2>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-gold/10 text-gold border border-gold/30 rounded-md px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-wider hover:bg-gold/20 transition-colors"
          >
            <Printer size={14} /> Print Menu
          </button>
        </div>
        <p className="text-xs text-tan mt-2 leading-relaxed">Choose your flavour · Every sip has a story</p>
      </div>

      <div className="px-4 space-y-3">
        {MENU.map(item => (
          <div key={item.id} className={`bg-card border border-cream-darker rounded-xl p-4 relative overflow-hidden ${item.viral ? 'bg-gradient-to-br from-[#FFF5E8] to-[#FDEBD0] border-rust/30' : ''}`}>
            <div className="absolute right-3 -bottom-2 font-display text-7xl font-black text-brown opacity-5 leading-none select-none pointer-events-none">{item.n}</div>
            
            {item.viral && (
              <div className="inline-flex items-center gap-1 bg-rust text-white font-display text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-sm mb-2">
                <Star size={10} fill="currentColor" /> Trending on Instagram
              </div>
            )}

            <div className="flex justify-between items-start gap-2 mb-1">
              <div className="font-display text-xl font-semibold text-brown uppercase tracking-tight leading-tight">{item.emoji} {item.name}</div>
              <div className="font-serif text-2xl font-bold text-brown leading-none flex-shrink-0">
                <span className="text-sm font-normal text-mocha align-top mr-0.5">₹</span>{item.price}
              </div>
            </div>
            <div className="font-handwriting text-sm text-mocha mb-3 font-medium">{item.sub}</div>

            {!item.viral && (
              <div className="mb-3">
                <div className="font-display text-[9px] font-semibold uppercase tracking-widest text-mocha mb-1.5">Flavour</div>
                <div className="flex flex-wrap gap-1.5">
                  {FLAVOURS.map(f => (
                    <button
                      key={f.label}
                      onClick={() => setFlavours(prev => ({ ...prev, [item.id]: f.label }))}
                      className={`px-3 py-1 rounded-sm font-sans text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
                        flavours[item.id] === f.label 
                          ? 'bg-brown text-cream border-brown' 
                          : 'bg-transparent text-mocha border-cream-darker hover:border-tan hover:text-brown'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: f.dot }} />
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-0.5">
                <button 
                  onClick={() => updateQuantity(item.id, -1)}
                  className="w-8 h-8 rounded-md border border-cream-darker bg-cream-dark text-brown flex items-center justify-center hover:bg-cream-darker transition-colors"
                >
                  <Minus size={14} />
                </button>
                <div className="min-w-[32px] text-center text-sm font-bold text-brown">{quantities[item.id]}</div>
                <button 
                  onClick={() => updateQuantity(item.id, 1)}
                  className="w-8 h-8 rounded-md border border-cream-darker bg-cream-dark text-brown flex items-center justify-center hover:bg-cream-darker transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
              <button 
                onClick={() => addToCart(item)}
                className="bg-brown text-cream border-none rounded-md px-5 py-2 font-display text-xs font-semibold uppercase tracking-wider hover:bg-brown-light transition-all active:scale-95"
              >
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center p-6 font-handwriting text-base text-tan opacity-70">
        ✦ Every sip has a story ✦
      </div>
    </motion.div>
  );

  const renderToppings = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-24">
      <div className="p-6 pt-8">
        <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold mb-1">Free with a roll</div>
        <h2 className="font-display text-3xl font-bold text-cream uppercase tracking-wider leading-none">Top<span className="text-gold italic font-serif">pings</span></h2>
        <p className="text-xs text-tan mt-2 leading-relaxed">Six toppings · Roll the dice at the counter · Follow & tag to unlock!</p>
      </div>

      <div className="px-4 space-y-4">
        <div className="bg-card border-[1.5px] border-dashed border-rust rounded-2xl p-5 text-center">
          <span className="text-4xl block mb-2">🎲</span>
          <h3 className="font-display text-xl font-bold text-brown uppercase tracking-wider mb-2">How to Get a Free Topping</h3>
          <p className="text-xs text-mocha leading-relaxed mb-4">Follow us on Instagram, buy any coffee, tag us in your story, show us at the counter — we hand you the dice!</p>
          
          <div className="space-y-2 text-left mb-4">
            {[
              { n: 1, t: <>Follow <strong>@dice_n._ice</strong> on Instagram</> },
              { n: 2, t: <>Buy <strong>any coffee</strong> from our menu</> },
              { n: 3, t: <>Post a story <strong>tagging @dice_n._ice</strong> and show us</> },
              { n: 4, t: <>Roll the dice 🎲 → win that <strong>topping FREE!</strong></> }
            ].map(step => (
              <div key={step.n} className="flex items-start gap-3 bg-brown/5 rounded-lg p-2.5">
                <div className="w-6 h-6 rounded-full bg-brown text-cream font-display text-xs font-bold flex items-center justify-center flex-shrink-0">{step.n}</div>
                <div className="text-xs text-brown leading-tight flex-1 pt-0.5">{step.t}</div>
              </div>
            ))}
          </div>

          <a 
            href="https://www.instagram.com/dice_n._ice?igsh=b2I1dzU4bzN0aTRn" 
            target="_blank" 
            rel="noopener"
            className="inline-flex items-center gap-2 bg-brown text-cream border border-gold rounded-md px-5 py-2.5 font-display text-xs font-semibold uppercase tracking-wider hover:bg-brown-light transition-colors no-underline"
          >
            <Instagram size={14} /> Follow @dice_n._ice
          </a>
        </div>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gold/25" />
          <div className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-gold whitespace-nowrap">The 6 Toppings</div>
          <div className="flex-1 h-px bg-gold/25" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {TOPPINGS.map(t => (
            <div key={t.name} className="bg-card border border-cream-darker rounded-xl p-3.5 text-center">
              <div className="text-2xl mb-1.5">{t.emoji}</div>
              <div className="font-display text-[13px] font-bold text-brown uppercase tracking-tight">{t.name}</div>
              <div className="text-[10px] text-rust font-bold mt-1 uppercase tracking-wider">{t.dice} · FREE!</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );

  const renderCart = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-24">
      <div className="p-6 pt-8">
        <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold mb-1">Your order</div>
        <h2 className="font-display text-3xl font-bold text-cream uppercase tracking-wider leading-none">Your <span className="text-gold italic font-serif">Cart</span></h2>
      </div>

      {cart.length === 0 ? (
        <div className="text-center py-12 px-6">
          <div className="text-5xl opacity-30 mb-3">☕</div>
          <h3 className="font-display text-xl font-bold text-cream uppercase tracking-wider mb-1.5">Cart is Empty</h3>
          <p className="text-xs text-tan leading-relaxed mb-6">Add a drink from the menu first!</p>
          <button 
            onClick={() => setActivePage('menu')}
            className="inline-flex items-center gap-2 bg-cream text-brown border-2 border-gold rounded-md px-6 py-2.5 font-display text-xs font-semibold uppercase tracking-widest hover:bg-gold transition-colors"
          >
            Browse Menu
          </button>
        </div>
      ) : (
        <div className="px-4">
          <div className="space-y-2">
            {cart.map((item, idx) => (
              <div key={item.key} className="bg-card border border-cream-darker rounded-xl p-3 flex items-start gap-3">
                <div className="flex-1">
                  <div className="font-display text-sm font-bold text-brown uppercase tracking-tight mb-0.5">{item.emoji} {item.name} × {item.qty}</div>
                  <div className="text-[11px] text-muted leading-tight">{item.flv ? `${item.flv} flavour` : 'Original'}</div>
                </div>
                <div className="font-serif text-base font-bold text-brown flex-shrink-0 min-w-[44px] text-right">₹{item.price * item.qty}</div>
                <button 
                  onClick={() => removeFromCart(item.key)}
                  className="w-6 h-6 rounded-md bg-cream-dark border border-cream-darker text-mocha flex items-center justify-center hover:border-red-200 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 bg-card border border-cream-darker rounded-xl p-4">
            <div className="flex justify-between items-center font-display text-base font-bold text-brown uppercase tracking-wider pt-2 border-t border-dashed border-cream-darker">
              <span>Total</span>
              <span className="font-serif text-xl">₹{cartTotal}</span>
            </div>
          </div>

          <button 
            onClick={() => setActivePage('checkout')}
            className="w-full mt-4 bg-brown text-cream border-2 border-gold rounded-lg p-4 font-display text-sm font-semibold uppercase tracking-widest hover:bg-brown-light transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            Proceed to Checkout <ArrowRight size={16} />
          </button>
        </div>
      )}
    </motion.div>
  );

  const renderCheckout = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-24">
      <div className="p-6 pt-8">
        <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold mb-1">Almost there</div>
        <h2 className="font-display text-3xl font-bold text-cream uppercase tracking-wider leading-none">Check<span className="text-gold italic font-serif">out</span></h2>
      </div>

      <div className="px-4">
        <div className="bg-card border border-cream-darker rounded-xl p-4 mb-5">
          <div className="font-display text-[10px] font-bold uppercase tracking-widest text-mocha mb-3">Order Summary</div>
          <div className="space-y-1.5">
            {cart.map(item => (
              <div key={item.key} className="flex justify-between text-xs text-brown">
                <span>{item.emoji} {item.name} ×{item.qty}{item.flv ? ` (${item.flv})` : ''}</span>
                <span>₹{item.price * item.qty}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-display text-sm font-bold text-brown uppercase tracking-wider pt-2.5 border-t border-dashed border-cream-darker mt-2">
            <span>Total</span>
            <span>₹{cartTotal}</span>
          </div>
        </div>

        <p className="font-handwriting text-lg text-tan text-center mb-5">"Your coffee is about to be brewed ☕"</p>

        <div className="space-y-3.5">
          <div>
            <label className="font-display text-[10px] font-bold uppercase tracking-widest text-gold block mb-1.5">Your name</label>
            <input 
              type="text" 
              value={checkoutData.name}
              onChange={e => setCheckoutData({ ...checkoutData, name: e.target.value })}
              className="w-full p-3 bg-card border border-cream-darker rounded-lg text-brown text-sm font-sans outline-none focus:border-gold transition-colors"
              placeholder="e.g. Riya"
            />
          </div>
          <div>
            <label className="font-display text-[10px] font-bold uppercase tracking-widest text-gold block mb-1.5">WhatsApp number</label>
            <input 
              type="tel" 
              value={checkoutData.phone}
              onChange={e => setCheckoutData({ ...checkoutData, phone: e.target.value })}
              className="w-full p-3 bg-card border border-cream-darker rounded-lg text-brown text-sm font-sans outline-none focus:border-gold transition-colors"
              placeholder="10-digit number"
              maxLength={10}
            />
          </div>
          <div>
            <label className="font-display text-[10px] font-bold uppercase tracking-widest text-gold block mb-1.5">Special note <span className="text-muted font-normal lowercase tracking-normal text-[9px] ml-1">(optional)</span></label>
            <input 
              type="text" 
              value={checkoutData.note}
              onChange={e => setCheckoutData({ ...checkoutData, note: e.target.value })}
              className="w-full p-3 bg-card border border-cream-darker rounded-lg text-brown text-sm font-sans outline-none focus:border-gold transition-colors"
              placeholder="less sugar, extra ice…"
            />
          </div>

          <div>
            <label className="font-display text-[10px] font-bold uppercase tracking-widest text-gold block mb-1.5">Payment method</label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setPayMethod('counter')}
                className={`p-3.5 rounded-xl border-2 transition-all text-center ${
                  payMethod === 'counter' 
                    ? 'border-gold bg-gold/5' 
                    : 'border-cream-darker bg-card hover:border-tan'
                }`}
              >
                <div className="text-2xl mb-1.5">💵</div>
                <div className="font-display text-xs font-bold uppercase tracking-wider text-brown">Pay at Counter</div>
                <div className="text-[9px] text-mocha mt-0.5">Cash or UPI at stall</div>
              </button>
              <button 
                onClick={() => setPayMethod('upi')}
                className={`p-3.5 rounded-xl border-2 transition-all text-center ${
                  payMethod === 'upi' 
                    ? 'border-gold bg-gold/5' 
                    : 'border-cream-darker bg-card hover:border-tan'
                }`}
              >
                <div className="text-2xl mb-1.5">📱</div>
                <div className="font-display text-xs font-bold uppercase tracking-wider text-brown">Pay Now (UPI)</div>
                <div className="text-[9px] text-mocha mt-0.5">Pre-pay online</div>
              </button>
            </div>
          </div>

          {payMethod === 'upi' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
              <div className="bg-brown/5 border-[1.5px] border-dashed border-cream-darker rounded-xl p-4 mb-3.5">
                <div className="font-display text-[10px] font-bold uppercase tracking-widest text-gold mb-2">Scan & Pay via UPI</div>
                <div className="font-display text-xl font-bold text-brown tracking-wider text-center mb-1">{UPI_ID}</div>
                <p className="text-[10px] text-mocha text-center leading-relaxed">Pay the total amount shown above, then enter your UTR / transaction ID below</p>
                <div className="text-center mt-2">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(UPI_ID);
                      showToast('UPI ID copied!');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-brown text-cream border-none font-display text-[10px] font-bold uppercase tracking-wider hover:bg-brown-light transition-colors"
                  >
                    <Copy size={12} /> Copy UPI ID
                  </button>
                </div>
              </div>
              <div>
                <label className="font-display text-[10px] font-bold uppercase tracking-widest text-gold block mb-1.5">UTR / Transaction ID</label>
                <input 
                  type="text" 
                  value={checkoutData.utr}
                  onChange={e => setCheckoutData({ ...checkoutData, utr: e.target.value })}
                  className="w-full p-3 bg-card border border-cream-darker rounded-lg text-brown text-sm font-sans outline-none focus:border-gold transition-colors"
                  placeholder="Enter after paying"
                />
              </div>
            </motion.div>
          )}

          <button 
            onClick={handleCheckout}
            className="w-full bg-orange text-white border-none rounded-lg p-4 font-display text-sm font-semibold uppercase tracking-[0.1em] hover:bg-orange-light transition-all active:scale-95 mt-1"
          >
            Place Order ✨
          </button>
        </div>
      </div>
    </motion.div>
  );

  const renderConfirm = () => (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="pb-24 min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
      <motion.div 
        animate={{ y: [0, -8, 0] }} 
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="text-6xl mb-4"
      >
        ☕
      </motion.div>
      <h2 className="font-display text-3xl font-bold text-cream uppercase tracking-wider leading-[1.05] mb-2">
        Order<br /><span className="text-gold italic font-serif text-4xl">Placed!</span>
      </h2>
      <p className="text-sm text-tan leading-relaxed max-w-[280px] mb-2">
        {payMethod === 'upi' ? 'We got your order. Verifying payment…' : 'We got your order. See you at the stall!'}
      </p>
      <p className="font-handwriting text-lg text-gold mb-5">"Made with luck & love 🎲"</p>
      
      <div className="bg-card border-2 border-gold rounded-xl p-4 w-full max-w-[300px] mb-6">
        <div className="font-display text-[10px] font-bold uppercase tracking-widest text-mocha mb-1">Order ID</div>
        <div className="font-serif text-3xl font-bold text-brown">{lastOrderId}</div>
        <div className="text-xs text-mocha mt-1.5 leading-relaxed">
          {payMethod === 'upi' ? '💳 Paid via UPI' : '💵 Pay at counter when you collect'}
        </div>
      </div>

      <div className="flex items-center w-full max-w-[280px] mb-2">
        <div className="w-7 h-7 rounded-full bg-orange text-white flex items-center justify-center text-xs border-2 border-orange">✓</div>
        <div className="flex-1 h-0.5 bg-orange" />
        <div className="w-7 h-7 rounded-full bg-brown-light text-cream flex items-center justify-center text-xs border-2 border-mocha animate-pulse">⏳</div>
        <div className="flex-1 h-0.5 bg-mocha" />
        <div className="w-7 h-7 rounded-full bg-brown-light text-cream flex items-center justify-center text-xs border-2 border-mocha">☕</div>
        <div className="flex-1 h-0.5 bg-mocha" />
        <div className="w-7 h-7 rounded-full bg-brown-light text-cream flex items-center justify-center text-xs border-2 border-mocha">🏁</div>
      </div>
      <div className="flex justify-between w-full max-w-[280px] mb-6">
        <div className="text-[9px] text-tan font-medium uppercase tracking-wider w-7 text-center leading-tight">Placed</div>
        <div className="text-[9px] text-tan font-medium uppercase tracking-wider w-7 text-center leading-tight">Confirm</div>
        <div className="text-[9px] text-tan font-medium uppercase tracking-wider w-7 text-center leading-tight">Making</div>
        <div className="text-[9px] text-tan font-medium uppercase tracking-wider w-7 text-center leading-tight">Ready</div>
      </div>

      <button 
        onClick={() => setActivePage('home')}
        className="bg-cream text-brown border-2 border-gold rounded-md px-8 py-3 font-display text-xs font-semibold uppercase tracking-widest hover:bg-gold transition-colors"
      >
        Order Again 🎲
      </button>
    </motion.div>
  );

  const renderOwner = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-24">
      <div className="p-6 pt-8">
        <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold mb-1">Stall owner</div>
        <div className="flex justify-between items-center">
          <h2 className="font-display text-3xl font-bold text-cream uppercase tracking-wider leading-none">Dash<span className="text-gold italic font-serif">board</span></h2>
          {user && (
            <button onClick={logout} className="text-tan hover:text-cream flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest">
              <LogOut size={14} /> Logout
            </button>
          )}
        </div>
        <p className="text-xs text-tan mt-2 leading-relaxed">Live orders · Real-time updates</p>
      </div>

      {!user ? (
        <div className="px-4">
          <div className="bg-card border border-cream-darker rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-brown rounded-full flex items-center justify-center mx-auto mb-4">
              <LayoutDashboard className="text-gold" size={32} />
            </div>
            <h3 className="font-display text-xl font-bold text-brown uppercase tracking-wider mb-2">Owner Login</h3>
            <p className="text-xs text-mocha leading-relaxed mb-6">Sign in with your Google account to access the live order dashboard.</p>
            <button 
              onClick={login}
              className="w-full bg-brown text-cream border-2 border-gold rounded-lg p-3.5 font-display text-xs font-semibold uppercase tracking-widest hover:bg-brown-light transition-all flex items-center justify-center gap-2"
            >
              Sign in with Google
            </button>
          </div>
        </div>
      ) : user.email !== 'sityabhargav@gmail.com' ? (
        <div className="px-4">
          <div className="bg-card border border-red-200 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">🚫</div>
            <h3 className="font-display text-xl font-bold text-red-800 uppercase tracking-wider mb-2">Access Denied</h3>
            <p className="text-xs text-red-600 leading-relaxed mb-6">You don't have permission to view this dashboard. Please log in with the owner's account.</p>
            <button onClick={logout} className="text-brown font-bold uppercase text-[10px] tracking-widest underline">Switch Account</button>
          </div>
        </div>
      ) : (
        <div className="px-4">
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-card border border-cream-darker rounded-xl p-3 text-center">
              <div className="font-serif text-2xl font-bold text-brown leading-none">{stats.totalOrders}</div>
              <div className="text-[9px] text-mocha font-bold uppercase tracking-wider mt-1">Orders</div>
            </div>
            <div className="bg-card border border-cream-darker rounded-xl p-3 text-center">
              <div className="font-serif text-2xl font-bold text-brown leading-none">₹{stats.revenue}</div>
              <div className="text-[9px] text-mocha font-bold uppercase tracking-wider mt-1">Revenue</div>
            </div>
            <div className="bg-card border border-cream-darker rounded-xl p-3 text-center">
              <div className="font-serif text-2xl font-bold text-brown leading-none">{stats.pending}</div>
              <div className="text-[9px] text-mocha font-bold uppercase tracking-wider mt-1">Pending</div>
            </div>
          </div>

          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-2 no-scrollbar">
            {['all', 'pending', 'confirmed', 'preparing', 'ready', 'done'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full font-display text-[9px] font-bold uppercase tracking-widest border transition-all whitespace-nowrap ${
                  filter === f 
                    ? 'bg-brown text-cream border-brown' 
                    : 'bg-transparent text-tan border-cream-darker hover:border-tan'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-10 font-handwriting text-lg text-tan">No orders found 🎲</div>
            ) : (
              filteredOrders.map((order: any) => (
                <div key={order.firebaseId} className="bg-card border border-cream-darker rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-display text-sm font-bold text-brown uppercase tracking-wider flex items-center gap-2">
                        {order.id}
                        <span className={`text-[9px] px-2 py-0.5 rounded-sm ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'preparing' ? 'bg-purple-100 text-purple-800' :
                          order.status === 'ready' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted">{order.date} {order.time}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-serif text-lg font-bold text-brown">₹{order.total}</div>
                      <div className={`text-[9px] font-bold uppercase ${order.payMethod === 'upi' ? 'text-green-600' : 'text-orange-600'}`}>
                        {order.payMethod === 'upi' ? 'UPI' : 'Counter'}
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="text-xs font-bold text-brown">{order.name}</div>
                    <div className="text-[10px] text-mocha flex items-center gap-1">
                      <MessageCircle size={10} /> +91{order.phone}
                    </div>
                  </div>

                  <div className="bg-brown/5 rounded-lg p-2.5 mb-3 text-[11px] text-brown leading-relaxed">
                    {order.items.map((it: any, i: number) => (
                      <div key={i}>{it.emoji} {it.name} {it.flv ? `(${it.flv})` : ''} ×{it.qty}</div>
                    ))}
                  </div>

                  {order.note && (
                    <div className="text-[10px] text-mocha italic mb-3">Note: {order.note}</div>
                  )}
                  {order.utr && (
                    <div className="text-[10px] text-green-700 font-bold mb-3">UTR: {order.utr}</div>
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-3 border-t border-dashed border-cream-darker">
                    {order.status === 'pending' && (
                      <button onClick={() => updateOrderStatus(order.firebaseId, 'confirmed')} className="bg-orange text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md">Confirm</button>
                    )}
                    {order.status === 'confirmed' && (
                      <button onClick={() => updateOrderStatus(order.firebaseId, 'preparing')} className="bg-blue-600 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md">Prepare</button>
                    )}
                    {order.status === 'preparing' && (
                      <button onClick={() => updateOrderStatus(order.firebaseId, 'ready')} className="bg-green-600 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md">Ready</button>
                    )}
                    {order.status === 'ready' && (
                      <button onClick={() => updateOrderStatus(order.firebaseId, 'done')} className="bg-gray-600 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md">Done</button>
                    )}
                    <a 
                      href={`https://wa.me/91${order.phone}?text=${encodeURIComponent(`Hi ${order.name}! Your order ${order.id} is ${order.status === 'ready' ? 'READY for pickup! ☕🎲' : order.status + '.'}`)}`}
                      target="_blank"
                      rel="noopener"
                      className="bg-green-500 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md flex items-center gap-1"
                    >
                      <MessageCircle size={10} /> WhatsApp
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </motion.div>
  );

  return (
    <ErrorBoundary>
      <div className="min-h-screen relative overflow-x-hidden">
      <PrintableMenu />
      
      <div className="no-print">
        <nav className="sticky top-0 z-[200] bg-brown border-b-2 border-gold px-4 py-3 flex items-center justify-between shadow-lg">
          <div className="cursor-pointer flex flex-col" onClick={() => setActivePage('home')}>
            <div className="font-display text-xl font-bold text-cream tracking-widest uppercase leading-none">
              Dice N' <span className="text-gold italic font-serif">Ice</span>
            </div>
            <div className="text-[9px] font-medium text-tan tracking-[0.16em] uppercase mt-0.5">Cold Coffee · Est. 2025</div>
          </div>
          <div className="flex items-center gap-2">
            {user && user.email === 'sityabhargav@gmail.com' && (
              <button 
                onClick={() => setActivePage('owner')}
                className={`p-2 rounded-md transition-colors ${activePage === 'owner' ? 'bg-gold text-brown' : 'bg-gold/10 text-gold border border-gold/30'}`}
                title="Owner Dashboard"
              >
                <LayoutDashboard size={18} />
              </button>
            )}
            <button 
              onClick={() => setActivePage('cart')}
              className="flex items-center gap-2 bg-cream text-brown border-2 border-gold rounded-md px-3.5 py-1.5 font-display text-xs font-semibold uppercase tracking-wider hover:bg-gold transition-colors"
            >
              <div className="bg-rust text-white w-4.5 h-4.5 rounded-full text-[10px] font-bold flex items-center justify-center font-sans">{cartCount}</div>
              Cart
            </button>
          </div>
        </nav>

        <main>
          {activePage === 'home' && renderHome()}
          {activePage === 'menu' && renderMenu()}
          {activePage === 'toppings' && renderToppings()}
          {activePage === 'cart' && renderCart()}
          {activePage === 'checkout' && renderCheckout()}
          {activePage === 'confirm' && renderConfirm()}
          {activePage === 'owner' && renderOwner()}
        </main>

        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-brown border-t-2 border-gold flex z-[200] pb-[env(safe-area-inset-bottom,4px)] shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
          <button 
            onClick={() => setActivePage('home')}
            className={`flex-1 flex flex-col items-center gap-0.5 pt-2.5 pb-1.5 font-display text-[9px] font-medium uppercase tracking-wider transition-colors ${activePage === 'home' ? 'text-gold' : 'text-tan'}`}
          >
            <Home size={20} />
            Home
          </button>
          <button 
            onClick={() => setActivePage('menu')}
            className={`flex-1 flex flex-col items-center gap-0.5 pt-2.5 pb-1.5 font-display text-[9px] font-medium uppercase tracking-wider transition-colors ${activePage === 'menu' ? 'text-gold' : 'text-tan'}`}
          >
            <MenuIcon size={20} />
            Menu
          </button>
          <button 
            onClick={() => setActivePage('toppings')}
            className={`flex-1 flex flex-col items-center gap-0.5 pt-2.5 pb-1.5 font-display text-[9px] font-medium uppercase tracking-wider transition-colors ${activePage === 'toppings' ? 'text-gold' : 'text-tan'}`}
          >
            <Star size={20} />
            Toppings
          </button>
          <button 
            onClick={() => setActivePage('cart')}
            className={`flex-1 flex flex-col items-center gap-0.5 pt-2.5 pb-1.5 font-display text-[9px] font-medium uppercase tracking-wider transition-colors ${activePage === 'cart' ? 'text-gold' : 'text-tan'}`}
          >
            <ShoppingCart size={20} />
            Cart
          </button>
        </nav>

        <Toast message={toast.message} show={toast.show} />
      </div>
    </div>
    </ErrorBoundary>
  );
}
