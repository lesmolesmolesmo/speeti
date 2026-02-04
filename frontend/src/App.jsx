import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { useEffect, lazy, Suspense } from 'react';
import { useStore } from './store';

// Pages - Critical (eager load)
import Home from './pages/Home';
import Category from './pages/Category';
import Search from './pages/Search';
import Cart from './pages/Cart';
import Login from './pages/Login';

// Pages - Lazy loaded for better performance
const Checkout = lazy(() => import('./pages/Checkout'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const Admin = lazy(() => import('./pages/Admin'));
const Driver = lazy(() => import('./pages/Driver'));
const Support = lazy(() => import('./pages/Support'));
const Track = lazy(() => import('./pages/Track'));
const Review = lazy(() => import('./pages/Review'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Warehouse = lazy(() => import('./pages/Warehouse'));
const FAQ = lazy(() => import("./pages/FAQ"));
const Product = lazy(() => import("./pages/Product"));

// Protected Route wrapper - handles auth check without conditional rendering in routes
const ProtectedRoute = ({ children, requiredRole, redirectTo = '/login' }) => {
  // Use selector to only subscribe to user changes, not entire store
  const user = useStore(state => state.user);
  const location = useLocation();
  
  if (!user) {
    return <Navigate to={redirectTo + '?redirect=' + location.pathname} replace />;
  }
  
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={redirectTo + '?redirect=' + location.pathname} replace />;
  }
  
  return children;
};

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

// Components
import Navbar from './components/Navbar';
import CartButton from './components/CartButton';
import DesktopSidebar from './components/DesktopSidebar';
import { ToastContainer } from './components/Toast';

function App() {
  const user = useStore(state => state.user);
  const fetchUser = useStore(state => state.fetchUser);
  const fetchCategories = useStore(state => state.fetchCategories);
  const location = useLocation();
  
  // Hide nav on admin/driver/support/warehouse pages (they have their own layout)
  const hideNav = ['/admin', '/driver', '/support', '/warehouse'].some(p => location.pathname.startsWith(p));
  const isFullscreenPage = ['/admin', '/driver', '/login', '/support', '/warehouse'].some(p => location.pathname.startsWith(p));

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
      <ErrorBoundary><main className={`flex-1 min-w-0 ${!hideNav ? 'pb-20 lg:pb-0' : ''}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/category/:slug" element={<Category />} />
          <Route path="/produkt/:slug" element={<Suspense fallback={<PageLoader />}><Product /></Suspense>} />
          <Route path="/search" element={<Search />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Checkout /></Suspense></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Orders /></Suspense></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><OrderDetail /></Suspense></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Profile /></Suspense></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin/*" element={<ProtectedRoute requiredRole="admin"><Suspense fallback={<PageLoader />}><Admin /></Suspense></ProtectedRoute>} />
          <Route path="/driver/*" element={<ProtectedRoute requiredRole="driver"><Suspense fallback={<PageLoader />}><Driver /></Suspense></ProtectedRoute>} />
          <Route path="/warehouse" element={<ProtectedRoute requiredRole="admin"><Suspense fallback={<PageLoader />}><Warehouse /></Suspense></ProtectedRoute>} />
          <Route path="/track" element={<Track />} />
          <Route path="/track/:orderNumber" element={<Track />} />
          <Route path="/bewertung/:orderNumber" element={<Review />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/support" element={<Support />} />
        </Routes>
      </main></ErrorBoundary>
      
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
