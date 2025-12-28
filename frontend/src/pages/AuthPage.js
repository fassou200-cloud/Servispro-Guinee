import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthPage = ({ setIsAuthenticated }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    password: '',
    profession: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? `${API}/auth/login` : `${API}/auth/register`;
      const payload = isLogin 
        ? { phone_number: formData.phone_number, password: formData.password }
        : formData;

      const response = await axios.post(endpoint, payload);
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      toast.success(isLogin ? 'Login successful!' : 'Registration successful!');
      setIsAuthenticated(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg shadow-sm p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-heading font-bold text-foreground mb-2">
              ServisPro
            </h1>
            <p className="text-muted-foreground">
              {isLogin ? 'Welcome back' : 'Create your profile'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="font-heading text-xs uppercase tracking-wide">
                    First Name
                  </Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    data-testid="register-first-name-input"
                    value={formData.first_name}
                    onChange={handleChange}
                    required={!isLogin}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name" className="font-heading text-xs uppercase tracking-wide">
                    Last Name
                  </Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    data-testid="register-last-name-input"
                    value={formData.last_name}
                    onChange={handleChange}
                    required={!isLogin}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profession" className="font-heading text-xs uppercase tracking-wide">
                    Profession
                  </Label>
                  <Select
                    value={formData.profession}
                    onValueChange={(value) => setFormData({ ...formData, profession: value })}
                    required={!isLogin}
                  >
                    <SelectTrigger data-testid="register-profession-select" className="h-12">
                      <SelectValue placeholder="Select your profession" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Electrician">Electrician</SelectItem>
                      <SelectItem value="Mechanic">Mechanic</SelectItem>
                      <SelectItem value="Plumber">Plumber</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone_number" className="font-heading text-xs uppercase tracking-wide">
                Phone Number
              </Label>
              <Input
                id="phone_number"
                name="phone_number"
                data-testid="auth-phone-input"
                value={formData.phone_number}
                onChange={handleChange}
                required
                className="h-12 font-mono"
                placeholder="1234567890"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-heading text-xs uppercase tracking-wide">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                data-testid="auth-password-input"
                value={formData.password}
                onChange={handleChange}
                required
                className="h-12"
              />
            </div>

            <Button 
              type="submit" 
              data-testid="auth-submit-button"
              className="w-full h-12 font-heading font-bold text-base"
              disabled={loading}
            >
              {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              data-testid="auth-toggle-button"
              onClick={() => {
                setIsLogin(!isLogin);
                setFormData({ first_name: '', last_name: '', phone_number: '', password: '', profession: '' });
              }}
              className="text-sm text-primary hover:underline"
            >
              {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;