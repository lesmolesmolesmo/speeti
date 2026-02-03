import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import Admin from './pages/Admin';
import Driver from './pages/Driver';

// Components
import Navbar from './components/Navbar';
import CartButton from './components/CartButton';
import DesktopSidebar from './components/DesktopSidebar';
import { ToastContainer } from './components/Toast';

function App() {
  const { user, token, fetchUser, fetchCategories } = useStore();
  const location = useLocation();
  
  // Hide nav on admin/driver pages (they have their own layout)
  const hideNav = ['/admin', '/driver'].some(p => location.pathname.startsWith(p));
  const isFullscreenPage = ['/admin', '/driver', '/login'].some(p => location.pathname.startsWith(p));

  useEffect(() => {
    fetchCategories();
    // Bei Seitenstart: Token prüfen und User laden
    const savedToken = localStorage.getItem('speeti-token');
    if (savedToken) {
      fetchUser();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {/* Desktop Sidebar - ONLY on large screens, hidden on mobile */}
      <div className="hidden lg:block">
        {!isFullscreenPage && <DesktopSidebar />}
      </div>

      {/* Main Content */}
      <main className={`flex-1 min-w-0 ${!hideNav ? 'pb-20 lg:pb-0' : ''}`}>
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
          <Route path="/admin/*" element={user?.role === 'admin' ? <Admin /> : <Navigate to="/login?redirect=/admin" />} />
          <Route path="/driver/*" element={user?.role === 'driver' ? <Driver /> : <Navigate to="/login?redirect=/driver" />} />
        </Routes>
      </main>
      
      {/* Mobile Bottom Navigation - hidden on desktop and fullscreen pages */}
      {!hideNav && (
        <>
          <div className="lg:hidden">
            <Navbar />
            <CartButton />
          </div>
        </>
      )}
      
      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

export default App;
