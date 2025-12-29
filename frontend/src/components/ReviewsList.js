import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Star } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ReviewsList = ({ providerId }) => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [providerId]);

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API}/reviews/${providerId}`);
      setReviews(response.data);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/reviews/${providerId}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return <Card className="p-6"><p className="text-muted-foreground">Chargement des avis...</p></Card>;
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      {stats && stats.total_reviews > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-5xl font-heading font-bold text-foreground mb-1">
                {stats.average_rating}
              </div>
              <div className="flex justify-center mb-1">
                {renderStars(Math.round(stats.average_rating))}
              </div>
              <div className="text-sm text-muted-foreground">
                {stats.total_reviews} avis
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-sm w-3">{star}</span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-yellow-400 h-full transition-all"
                      style={{
                        width: `${stats.total_reviews > 0 ? (stats.rating_distribution[star] / stats.total_reviews) * 100 : 0}%`
                      }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-8 text-right">
                    {stats.rating_distribution[star]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              Aucun avis pour le moment. Soyez le premier à laisser un avis !
            </p>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id} className="p-6" data-testid={`review-${review.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-heading font-bold text-foreground mb-1">
                    {review.reviewer_name}
                  </h4>
                  {renderStars(review.rating)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(review.created_at).toLocaleDateString()}
                </div>
              </div>
              <p className="text-foreground leading-relaxed">{review.comment}</p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ReviewsList;