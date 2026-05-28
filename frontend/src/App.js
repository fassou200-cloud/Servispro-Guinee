import { useState, useEffect } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CustomerHome from '@/pages/CustomerHome';
import LandingPage from '@/pages/LandingPage';
import BrowseProviders from '@/pages/BrowseProviders';
import ProviderProfile from '@/pages/ProviderProfile';
import BrowseRentals from '@/pages/BrowseRentals';
import BrowsePropertySales from '@/pages/BrowsePropertySales';
import RentalDetail from '@/pages/RentalDetail';
import Marketplace from '@/pages/Marketplace';
import ShopDetail from '@/pages/ShopDetail';
import ProductDetail from '@/pages/ProductDetail';
import CustomerAuth from '@/pages/CustomerAuth';
import CustomerDashboard from '@/pages/CustomerDashboard';
import AuthPage from '@/pages/AuthPage';
import Dashboard from '@/pages/Dashboard';
import AdminAuth from '@/pages/AdminAuth';
import AdminDashboard from '@/pages/AdminDashboard';
import CompanyAuth from '@/pages/CompanyAuth';
import CompanyDashboard from '@/pages/CompanyDashboard';
import VerifyPhonePage from '@/pages/VerifyPhonePage';
import { Toaster } from '@/components/ui/sonner';
import FeedbackButton from '@/components/FeedbackButton';
import IOSInstallBanner from '@/components/IOSInstallBanner';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCustomerAuthenticated, setIsCustomerAuthenticated] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isCompanyAuthenticated, setIsCompanyAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const customerToken = localStorage.getItem('customerToken');
    const adminToken = localStorage.getItem('adminToken');
    const companyToken = localStorage.getItem('companyToken');
    setIsAuthenticated(!!token);
    setIsCustomerAuthenticated(!!customerToken);
    setIsAdminAuthenticated(!!adminToken);
    setIsCompanyAuthenticated(!!companyToken);
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Marketplace isCustomerAuthenticated={isCustomerAuthenticated} />} />
          <Route path="/home-classic" element={<CustomerHome isCustomerAuthenticated={isCustomerAuthenticated} />} />
          <Route path="/old-landing" element={<LandingPage isCustomerAuthenticated={isCustomerAuthenticated} />} />
          <Route path="/browse" element={<BrowseProviders isCustomerAuthenticated={isCustomerAuthenticated} />} />
          <Route path="/provider/:providerId" element={<ProviderProfile isCustomerAuthenticated={isCustomerAuthenticated} />} />
          <Route path="/rentals" element={<BrowseRentals isCustomerAuthenticated={isCustomerAuthenticated} />} />
          <Route path="/property-sales" element={<BrowsePropertySales isCustomerAuthenticated={isCustomerAuthenticated} />} />
          <Route path="/rental/:rentalId" element={<RentalDetail />} />
          
          {/* Makiti Routes */}
          <Route path="/makiti" element={<Marketplace isCustomerAuthenticated={isCustomerAuthenticated} />} />
          <Route path="/makiti/shop/:shopId" element={<ShopDetail />} />
          <Route path="/makiti/product/:productId" element={<ProductDetail />} />
          
          {/* Customer Routes */}
          <Route 
            path="/customer/auth" 
            element={isCustomerAuthenticated ? <Navigate to="/customer/dashboard" /> : <CustomerAuth setIsCustomerAuthenticated={setIsCustomerAuthenticated} />} 
          />
          <Route 
            path="/customer/dashboard" 
            element={isCustomerAuthenticated ? <CustomerDashboard setIsCustomerAuthenticated={setIsCustomerAuthenticated} /> : <Navigate to="/customer/auth" />} 
          />
          
          {/* Provider Routes */}
          <Route 
            path="/auth" 
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <AuthPage setIsAuthenticated={setIsAuthenticated} />} 
          />
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <Dashboard setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/auth" />} 
          />

          {/* Company Routes */}
          <Route 
            path="/company/auth" 
            element={isCompanyAuthenticated ? <Navigate to="/company/dashboard" /> : <CompanyAuth setIsCompanyAuthenticated={setIsCompanyAuthenticated} />} 
          />
          <Route 
            path="/company/dashboard" 
            element={isCompanyAuthenticated ? <CompanyDashboard setIsCompanyAuthenticated={setIsCompanyAuthenticated} /> : <Navigate to="/company/auth" />} 
          />

          {/* Phone verification */}
          <Route path="/verify-phone" element={<VerifyPhonePage />} />

          {/* Admin Routes */}
          <Route 
            path="/admin" 
            element={isAdminAuthenticated ? <Navigate to="/admin/dashboard" /> : <AdminAuth setIsAdminAuthenticated={setIsAdminAuthenticated} />} 
          />
          <Route 
            path="/admin/dashboard" 
            element={isAdminAuthenticated ? <AdminDashboard setIsAdminAuthenticated={setIsAdminAuthenticated} /> : <Navigate to="/admin" />} 
          />
        </Routes>
      </BrowserRouter>
      <Toaster />
      <FeedbackButton />
      <IOSInstallBanner />
    </div>
  );
}

export default App;