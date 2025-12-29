import { useState, useEffect } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from '@/pages/LandingPage';
import BrowseProviders from '@/pages/BrowseProviders';
import ProviderProfile from '@/pages/ProviderProfile';
import BrowseRentals from '@/pages/BrowseRentals';
import RentalDetail from '@/pages/RentalDetail';
import CustomerAuth from '@/pages/CustomerAuth';
import AuthPage from '@/pages/AuthPage';
import Dashboard from '@/pages/Dashboard';
import { Toaster } from '@/components/ui/sonner';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
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
          <Route path="/" element={<LandingPage />} />
          <Route path="/browse" element={<BrowseProviders />} />
          <Route path="/provider/:providerId" element={<ProviderProfile />} />
          <Route path="/rentals" element={<BrowseRentals />} />
          <Route path="/rental/:rentalId" element={<RentalDetail />} />
          
          {/* Customer Auth */}
          <Route path="/customer/auth" element={<CustomerAuth />} />
          
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