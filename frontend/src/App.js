import { useState, useEffect } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
          <Route 
            path="/auth" 
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <AuthPage setIsAuthenticated={setIsAuthenticated} />} 
          />
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <Dashboard setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/auth" />} 
          />
          <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/auth"} />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;