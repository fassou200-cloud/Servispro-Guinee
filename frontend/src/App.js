import { useState, useEffect } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from '@/pages/LandingPage';
import BrowseProviders from '@/pages/BrowseProviders';
import ProviderProfile from '@/pages/ProviderProfile';
import BrowseRentals from '@/pages/BrowseRentals';
import RentalDetail from '@/pages/RentalDetail';
import CustomerAuth from '@/pages/CustomerAuth';
import CustomerDashboard from '@/pages/CustomerDashboard';
import AuthPage from '@/pages/AuthPage';
import Dashboard from '@/pages/Dashboard';
import { Toaster } from '@/components/ui/sonner';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCustomerAuthenticated, setIsCustomerAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const customerToken = localStorage.getItem('customerToken');
    setIsAuthenticated(!!token);
    setIsCustomerAuthenticated(!!customerToken);
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
          <Route path="/" element={<LandingPage isCustomerAuthenticated={isCustomerAuthenticated} />} />
          <Route path="/browse" element={<BrowseProviders isCustomerAuthenticated={isCustomerAuthenticated} />} />
          <Route path="/provider/:providerId" element={<ProviderProfile isCustomerAuthenticated={isCustomerAuthenticated} />} />
          <Route path="/rentals" element={<BrowseRentals isCustomerAuthenticated={isCustomerAuthenticated} />} />
          <Route path="/rental/:rentalId" element={<RentalDetail />} />
          
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
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;