import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MessageSquare, Calendar, User, TrendingUp, Award } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProviderReviews = ({ providerId }) => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (providerId) {
      fetchReviews();
      fetchStats();
    }
  }, [providerId]);

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API}/reviews/${providerId}`);
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/reviews/${providerId}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-200'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-yellow-100 rounded-xl">
          <Star className="h-6 w-6 text-yellow-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Avis des Clients</h2>
          <p className="text-sm text-gray-500">Consultez les retours de vos clients</p>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-200 rounded-lg">
                <Star className="h-5 w-5 text-yellow-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-800">
                  {stats.average_rating?.toFixed(1) || '0.0'}
                </p>
                <p className="text-xs text-yellow-600">Note moyenne</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-200 rounded-lg">
                <MessageSquare className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-800">{stats.total_reviews || 0}</p>
                <p className="text-xs text-blue-600">Total avis</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-200 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-800">
                  {stats.rating_distribution?.[5] || 0}
                </p>
                <p className="text-xs text-green-600">5 étoiles</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-200 rounded-lg">
                <Award className="h-5 w-5 text-purple-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-800">
                  {stats.total_reviews > 0 
                    ? Math.round(((stats.rating_distribution?.[4] || 0) + (stats.rating_distribution?.[5] || 0)) / stats.total_reviews * 100) 
                    : 0}%
                </p>
                <p className="text-xs text-purple-600">Satisfaction</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Rating Distribution */}
      {stats && stats.total_reviews > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Répartition des notes</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.rating_distribution?.[rating] || 0;
              const percentage = stats.total_reviews > 0 ? (count / stats.total_reviews) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-16">{rating} étoile{rating > 1 ? 's' : ''}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-yellow-400 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-500 w-12 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800">
          {reviews.length > 0 ? `${reviews.length} avis reçus` : 'Aucun avis pour le moment'}
        </h3>

        {reviews.length === 0 ? (
          <Card className="p-8 text-center bg-gray-50">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Vous n'avez pas encore reçu d'avis de vos clients.</p>
            <p className="text-sm text-gray-400 mt-1">
              Les avis apparaîtront ici une fois que vos clients auront évalué vos services.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12 border-2 border-gray-100">
                    <AvatarFallback className="bg-green-100 text-green-700 font-semibold">
                      {review.customer_name?.charAt(0).toUpperCase() || 'C'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{review.customer_name || 'Client'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {renderStars(review.rating)}
                          <span className="text-sm text-gray-500">({review.rating}/5)</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-gray-400 text-sm">
                        <Calendar className="h-4 w-4" />
                        {formatDate(review.created_at)}
                      </div>
                    </div>
                    
                    {review.comment && (
                      <p className="text-gray-600 mt-2 bg-gray-50 p-3 rounded-lg italic">
                        "{review.comment}"
                      </p>
                    )}
                    
                    {review.job_description && (
                      <p className="text-xs text-gray-400 mt-2">
                        Service: {review.job_description}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderReviews;
