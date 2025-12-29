import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, ShieldCheck, Briefcase, Phone } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import ServiceRequestForm from '@/components/ServiceRequestForm';
import ReviewForm from '@/components/ReviewForm';
import ReviewsList from '@/components/ReviewsList';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProviderProfile = () => {
  const navigate = useNavigate();
  const { providerId } = useParams();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [refreshReviews, setRefreshReviews] = useState(0);

  useEffect(() => {
    fetchProvider();
  }, [providerId]);

  const fetchProvider = async () => {
    try {
      const response = await axios.get(`${API}/providers/${providerId}`);
      setProvider(response.data);
    } catch (error) {
      toast.error('Failed to load provider details');
      navigate('/browse');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading provider details...</div>
      </div>
    );
  }

  if (!provider) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                data-testid="back-to-browse-button"
                onClick={() => navigate('/browse')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Browse
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
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        {/* Provider Header */}
        <Card className="p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start gap-8">
            <Avatar className="h-32 w-32">
              <AvatarImage
                src={provider.profile_picture ? `${BACKEND_URL}${provider.profile_picture}` : undefined}
                alt={`${provider.first_name} ${provider.last_name}`}
              />
              <AvatarFallback className="text-4xl font-heading bg-primary text-primary-foreground">
                {provider.first_name[0]}{provider.last_name[0]}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="mb-4">
                <h1 className="text-4xl font-heading font-bold text-foreground mb-2">
                  {provider.first_name} {provider.last_name}
                </h1>
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xl text-muted-foreground">{provider.profession}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {provider.online_status && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium bg-green-100 text-green-700 border border-green-200"
                          data-testid="provider-status-badge">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      Available Now
                    </span>
                  )}
                  {!provider.online_status && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      <div className="h-2 w-2 rounded-full bg-slate-400" />
                      Currently Unavailable
                    </span>
                  )}
                  {provider.id_verification_picture && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-700 border border-blue-200"
                          data-testid="provider-verified-badge">
                      <ShieldCheck className="h-4 w-4" />
                      ID Verified
                    </span>
                  )}
                </div>
              </div>

              <Button
                size="lg"
                data-testid="request-service-button"
                onClick={() => setShowRequestForm(!showRequestForm)}
                className="h-12 px-8 font-heading font-bold gap-2"
              >
                <Phone className="h-5 w-5" />
                {showRequestForm ? 'Hide Request Form' : 'Request Service'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Service Request Form */}
        {showRequestForm && (
          <Card className="p-8 mb-8" data-testid="service-request-form-container">
            <ServiceRequestForm
              providerId={provider.id}
              providerName={`${provider.first_name} ${provider.last_name}`}
              onSuccess={() => {
                setShowRequestForm(false);
                toast.success('Service request sent successfully!');
              }}
            />
          </Card>
        )}

        {/* About Section */}
        {provider.about_me && (
          <Card className="p-8">
            <h2 className="text-2xl font-heading font-bold text-foreground mb-4">
              About
            </h2>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {provider.about_me}
            </p>
          </Card>
        )}

        {!provider.about_me && (
          <Card className="p-8">
            <p className="text-muted-foreground text-center">
              This provider hasn't added a description yet.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProviderProfile;