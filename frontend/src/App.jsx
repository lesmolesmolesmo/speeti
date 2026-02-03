import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useStore } from './store';

// Pages
import Home from './pages/Home';
import Category from './pages/Category';
import Search from './pages/Search';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Profile from './pages/Profile';
import Login from './pages/Login';

// Components
import Navbar from './components/Navbar';
import CartButton from './components/CartButton';

function App() {
  const { user, token, fetchUser, fetchCategories } = useStore();

  useEffect(() => {
    fetchCategories();
    if (token) fetchUser();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/category/:slug" element={<Category />} />
        <Route path="/search" element={<Search />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={user ? <Checkout /> : <Navigate to="/login?redirect=/checkout" />} />
        <Route path="/orders" element={user ? <Orders /> : <Navigate to="/login?redirect=/orders" />} />
        <Route path="/orders/:id" element={user ? <OrderDetail /> : <Navigate to="/login" />} />
        <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login?redirect=/profile" />} />
        <Route path="/login" element={<Login />} />
      </Routes>
      
      <Navbar />
      <CartButton />
    </div>
  );
}

export default App;
