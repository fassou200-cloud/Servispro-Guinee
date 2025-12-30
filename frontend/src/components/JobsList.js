import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, MapPin, Calendar, CheckCheck } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Traduction des statuts
const translateStatus = (status) => {
  const translations = {
    'Pending': 'En attente',
    'Accepted': 'Accepté',
    'Rejected': 'Refusé',
    'ProviderCompleted': 'En attente confirmation client',
    'Completed': 'Terminé'
  };
  return translations[status] || status;
};

const JobsList = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
    // Poll for new jobs every 10 seconds
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/jobs/my-jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJobs(response.data);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJobAction = async (jobId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API}/jobs/${jobId}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Travail ${status === 'Accepted' ? 'accepté' : status === 'Rejected' ? 'refusé' : 'mis à jour'} avec succès`);
      fetchJobs();
    } catch (error) {
      toast.error(`Échec de l'opération sur le travail`);
    }
  };

  const handleMarkComplete = async (jobId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API}/jobs/${jobId}/provider-complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Travail marqué comme terminé ! En attente de confirmation du client.');
      fetchJobs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Échec de l\'opération');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      Pending: 'bg-orange-100 text-orange-700 border-orange-200',
      Accepted: 'bg-blue-100 text-blue-700 border-blue-200',
      Rejected: 'bg-slate-100 text-slate-600 border-slate-200',
      ProviderCompleted: 'bg-purple-100 text-purple-700 border-purple-200',
      Completed: 'bg-green-100 text-green-700 border-green-200'
    };
    return styles[status] || styles.Pending;
  };

  if (loading) {
    return (
      <Card className="p-8">
        <p className="text-center text-muted-foreground">Chargement des travaux...</p>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-heading font-bold text-foreground mb-2">
            Aucune Demande de Travail
          </h3>
          <p className="text-muted-foreground">
            Vous verrez ici les demandes de travail des clients quand elles arrivent.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-heading font-bold text-foreground">
          Demandes de Travail ({jobs.length})
        </h3>
      </div>

      {jobs.map((job) => (
        <Card key={job.id} className="p-6" data-testid={`job-card-${job.id}`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h4 className="text-xl font-heading font-bold text-foreground">
                  {job.service_type}
                </h4>
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium border ${getStatusBadge(job.status)}`}
                      data-testid={`job-status-${job.id}`}>
                  {translateStatus(job.status)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground font-mono">Client: {job.client_name}</p>
            </div>
          </div>

          <p className="text-foreground mb-4">{job.description}</p>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
            {job.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {job.location}
              </div>
            )}
            {job.scheduled_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(job.scheduled_date).toLocaleDateString()}
              </div>
            )}
          </div>

          {job.status === 'Pending' && (
            <div className="flex gap-3">
              <Button
                onClick={() => handleJobAction(job.id, 'Accepted')}
                data-testid={`accept-job-${job.id}`}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <CheckCircle className="h-4 w-4" />
                Accepter
              </Button>
              <Button
                onClick={() => handleJobAction(job.id, 'Rejected')}
                data-testid={`reject-job-${job.id}`}
                variant="outline"
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                Refuser
              </Button>
            </div>
          )}

          {job.status === 'Accepted' && (
            <div className="flex gap-3">
              <Button
                onClick={() => handleMarkComplete(job.id)}
                data-testid={`complete-job-${job.id}`}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCheck className="h-4 w-4" />
                Marquer comme Terminé
              </Button>
            </div>
          )}

          {job.status === 'ProviderCompleted' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-purple-700 text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                En attente de la confirmation du client
              </p>
            </div>
          )}

          {job.status === 'Completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-700 text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Service complété et confirmé par le client
              </p>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default JobsList;