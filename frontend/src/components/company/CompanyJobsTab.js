import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, Plus, MapPin, Calendar } from 'lucide-react';

const CompanyJobsTab = ({ jobOffers, company, setActiveTab }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-heading font-bold text-foreground">
          Mes Offres d'Emploi ({jobOffers.length})
        </h3>
      </div>

      {jobOffers.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aucune offre d'emploi publiée</p>
          {company.verification_status === 'approved' && (
            <Button className="mt-4" onClick={() => setActiveTab('create-job')}>
              <Plus className="h-4 w-4 mr-2" />
              Publier une offre
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {jobOffers.map(job => (
            <Card key={job.id} className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-lg font-heading font-bold text-foreground">{job.title}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-primary font-medium">{job.contract_type}</span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {job.location}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs ${job.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {job.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <p className="text-sm text-muted-foreground mt-1">{job.applications_count} candidature(s)</p>
                </div>
              </div>
              <p className="text-foreground text-sm mb-4 line-clamp-2">{job.description}</p>
              <div className="flex items-center justify-between">
                {job.deadline && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Date limite: {new Date(job.deadline).toLocaleDateString('fr-FR')}
                  </span>
                )}
                {job.salary_min && job.salary_max && (
                  <span className="text-primary font-bold">
                    {job.salary_min.toLocaleString()} - {job.salary_max.toLocaleString()} GNF
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompanyJobsTab;
