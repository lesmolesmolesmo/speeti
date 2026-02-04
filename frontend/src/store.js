import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('speeti-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const useStore = create(
  persist(
    (set, get) => ({
      // Auth - user wird jetzt auch persistiert!
      user: null,
      token: null,
      
      setToken: (token) => {
        localStorage.setItem('speeti-token', token);
        set({ token });
      },
      
      setUser: (user) => set({ user }),
      
      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('speeti-token', data.token);
        set({ user: data.user, token: data.token });
        return data;
      },
      
      register: async (email, password, name, phone) => {
        const { data } = await api.post('/auth/register', { email, password, name, phone });
        localStorage.setItem('speeti-token', data.token);
        set({ user: data.user, token: data.token });
        return data;
      },
      
      logout: () => {
        localStorage.removeItem('speeti-token');
        set({ user: null, token: null, addresses: [] });
      },
      
      fetchUser: async () => {
        const token = get().token || localStorage.getItem('speeti-token');
        if (!token) return null;
        
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data });
          return data;
        } catch (e) {
          // Token ungültig - logout
          get().logout();
          return null;
        }
      },
      
      // Cart
      cart: [],
      
      addToCart: (product) => {
        const cart = get().cart;
        const existing = cart.find(item => item.id === product.id);
        
        if (existing) {
          set({ cart: cart.map(item => 
            item.id === product.id 
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )});
        } else {
          set({ cart: [...cart, { ...product, quantity: 1 }] });
        }
      },
      
      removeFromCart: (productId) => {
        const cart = get().cart;
        const existing = cart.find(item => item.id === productId);
        
        if (existing && existing.quantity > 1) {
          set({ cart: cart.map(item => 
            item.id === productId 
              ? { ...item, quantity: item.quantity - 1 }
              : item
          )});
        } else {
          set({ cart: cart.filter(item => item.id !== productId) });
        }
      },
      
      clearCart: () => set({ cart: [] }),
      
      getCartTotal: () => {
        return get().cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },
      
      getCartCount: () => {
        return get().cart.reduce((sum, item) => sum + item.quantity, 0);
      },
      
      // Addresses
      addresses: [],
      selectedAddress: null,
      
      fetchAddresses: async () => {
        try {
          const { data } = await api.get('/addresses');
          set({ addresses: data, selectedAddress: data.find(a => a.is_default) || data[0] || null });
        } catch (e) {
          console.error(e);
        }
      },
      
      addAddress: async (address) => {
        const { data } = await api.post('/addresses', address);
        const addresses = [...get().addresses, data];
        set({ addresses, selectedAddress: data.is_default ? data : get().selectedAddress || data });
        return data;
      },
      
      selectAddress: (address) => set({ selectedAddress: address }),
      
      // Categories & Products
      categories: [],
      
      fetchCategories: async () => {
        try {
          const { data } = await api.get('/categories');
          set({ categories: data });
        } catch (e) {
          console.error(e);
        }
      },
      
      // Orders
      orders: [],
      currentOrder: null,
      
      createOrder: async (addressId, paymentMethod, notes, scheduledTime = null) => {
        const items = get().cart.map(item => ({ product_id: item.id, quantity: item.quantity }));
        const { data } = await api.post('/orders', { 
          address_id: addressId, 
          items, 
          payment_method: paymentMethod, 
          notes,
          scheduled_time: scheduledTime
        });
        get().clearCart();
        return data;
      },
      
      fetchOrders: async () => {
        const { data } = await api.get('/orders');
        set({ orders: data });
      },
      
      fetchOrder: async (id) => {
        const { data } = await api.get(`/orders/${id}`);
        set({ currentOrder: data });
        return data;
      },

      // ============ FAVORITEN ============
      favorites: [],
      
      toggleFavorite: (productId) => {
        const favorites = get().favorites;
        if (favorites.includes(productId)) {
          set({ favorites: favorites.filter(id => id !== productId) });
        } else {
          set({ favorites: [...favorites, productId] });
        }
      },
      
      isFavorite: (productId) => get().favorites.includes(productId),
      
      // ============ SHOP STATUS ============
      shopStatus: {
        open: true,
        reason: 'schedule',
        message: 'Geöffnet',
        openingTime: '08:00',
        closingTime: '22:00',
        manualOverride: null
      },
      
      fetchShopStatus: async () => {
        try {
          const { data } = await api.get('/shop/status');
          set({ shopStatus: data });
          return data;
        } catch (e) {
          console.error('Shop status fetch failed:', e);
          return get().shopStatus;
        }
      },
      
      toggleShop: async (action) => {
        try {
          const { data } = await api.post('/admin/shop/toggle', { action });
          set({ shopStatus: { ...get().shopStatus, ...data } });
          return data;
        } catch (e) {
          console.error('Shop toggle failed:', e);
          throw e;
        }
      }
    }),
    {
      name: 'speeti-storage',
      // WICHTIG: user, token UND favorites persistieren!
      partialize: (state) => ({ 
        cart: state.cart, 
        token: state.token,
        user: state.user,
        favorites: state.favorites
      })
    }
  )
);

export { api };
