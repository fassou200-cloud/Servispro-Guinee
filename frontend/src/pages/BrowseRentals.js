import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, MapPin, DollarSign, Home as HomeIcon } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BrowseRentals = () => {
  const navigate = useNavigate();
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRentals();
  }, []);

  const fetchRentals = async () => {
    try {
      const response = await axios.get(`${API}/rentals`);
      setRentals(response.data);
    } catch (error) {
      toast.error('Failed to load rental listings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading rental listings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                data-testid="back-button"
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                Browse Rental Listings
              </h1>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/auth')}
            >
              Provider Login
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
            Available Properties for Rent
          </h2>
          <p className="text-muted-foreground">
            {rentals.length} propert{rentals.length !== 1 ? 'ies' : 'y'} found
          </p>
        </div>

        {/* Rentals Grid */}
        {rentals.length === 0 ? (
          <Card className="p-12 text-center">
            <HomeIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">
              No rental listings available at the moment.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rentals.map((rental) => (
              <Card
                key={rental.id}
                className="overflow-hidden hover:border-primary/50 transition-colors duration-300 cursor-pointer"
                data-testid={`rental-card-${rental.id}`}
                onClick={() => navigate(`/rental/${rental.id}`)}
              >
                {rental.photos.length > 0 ? (
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={`${BACKEND_URL}${rental.photos[0]}`}
                      alt={rental.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <HomeIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-heading font-bold text-foreground">
                      {rental.title}
                    </h3>
                    <span className="inline-block px-2 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                      {rental.property_type}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {rental.description}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="line-clamp-1">{rental.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-lg font-bold text-primary">
                      <DollarSign className="h-5 w-5" />
                      {rental.rental_price}/month
                    </div>
                  </div>

                  <Button
                    className="w-full mt-4 font-heading"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/rental/${rental.id}`);
                    }}
                  >
                    View Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseRentals;