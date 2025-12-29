import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, MapPin, DollarSign, Home as HomeIcon, Phone, User } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RentalDetail = () => {
  const navigate = useNavigate();
  const { rentalId } = useParams();
  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    fetchRental();
  }, [rentalId]);

  const fetchRental = async () => {
    try {
      const response = await axios.get(`${API}/rentals/${rentalId}`);
      setRental(response.data);
    } catch (error) {
      toast.error('Failed to load rental details');
      navigate('/rentals');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading rental details...</div>
      </div>
    );
  }

  if (!rental) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                data-testid="back-to-rentals-button"
                onClick={() => navigate('/rentals')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Rentals
              </Button>
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
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {/* Photo Gallery */}
        {rental.photos.length > 0 ? (
          <Card className="mb-8 overflow-hidden">
            <div className="aspect-video relative bg-muted">
              <img
                src={`${BACKEND_URL}${rental.photos[currentPhotoIndex]}`}
                alt={rental.title}
                className="w-full h-full object-cover"
              />
              {rental.photos.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  {rental.photos.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentPhotoIndex
                          ? 'bg-white'
                          : 'bg-white/50 hover:bg-white/75'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card className="mb-8 aspect-video flex items-center justify-center bg-muted">
            <HomeIcon className="h-24 w-24 text-muted-foreground" />
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Property Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
                    {rental.title}
                  </h1>
                  <span className="inline-block px-3 py-1 rounded-md text-sm font-medium bg-muted text-muted-foreground">
                    {rental.property_type}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-heading font-bold text-primary">
                    ${rental.rental_price}
                  </div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground mb-6">
                <MapPin className="h-5 w-5" />
                <span className="text-lg">{rental.location}</span>
              </div>

              <div>
                <h2 className="text-xl font-heading font-bold text-foreground mb-3">
                  Description
                </h2>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {rental.description}
                </p>
              </div>
            </Card>
          </div>

          {/* Contact Card */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-8">
              <h3 className="text-xl font-heading font-bold text-foreground mb-4">
                Contact Owner
              </h3>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Owner</div>
                    <div className="font-medium text-foreground">{rental.provider_name}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Phone</div>
                    <div className="font-medium font-mono text-foreground">
                      {rental.provider_phone}
                    </div>
                  </div>
                </div>
              </div>

              <Button
                className="w-full h-12 font-heading font-bold gap-2"
                data-testid="contact-owner-button"
                onClick={() => window.open(`tel:${rental.provider_phone}`)}
              >
                <Phone className="h-5 w-5" />
                Call Owner
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentalDetail;