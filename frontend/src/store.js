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
      // Auth
      user: null,
      token: null,
      
      setToken: (token) => set({ token }),
      
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
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data });
        } catch (e) {
          get().logout();
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
      products: [],
      
      fetchCategories: async () => {
        const { data } = await api.get('/categories');
        set({ categories: data });
      },
      
      fetchProducts: async (category = null) => {
        const params = category ? { category } : {};
        const { data } = await api.get('/products', { params });
        set({ products: data });
      },
      
      // Orders
      orders: [],
      currentOrder: null,
      
      createOrder: async (addressId, paymentMethod, notes) => {
        const items = get().cart.map(item => ({ product_id: item.id, quantity: item.quantity }));
        const { data } = await api.post('/orders', { address_id: addressId, items, payment_method: paymentMethod, notes });
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
      }
    }),
    {
      name: 'speeti-storage',
      partialize: (state) => ({ cart: state.cart, token: state.token })
    }
  )
);

export { api };
