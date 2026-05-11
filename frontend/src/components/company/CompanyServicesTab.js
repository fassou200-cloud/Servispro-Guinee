import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Briefcase, Plus, MapPin } from 'lucide-react';

const CompanyServicesTab = ({ services, company, setActiveTab }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-heading font-bold text-foreground">
          Mes Services ({services.length})
        </h3>
      </div>

      {services.length === 0 ? (
        <Card className="p-8 text-center">
          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aucun service publié</p>
          {company.verification_status === 'approved' && (
            <Button className="mt-4" onClick={() => setActiveTab('create-service')}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un service
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map(service => (
            <Card key={service.id} className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-lg font-heading font-bold text-foreground">{service.title}</h4>
                  <p className="text-sm text-muted-foreground">{service.category}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${service.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {service.is_available ? 'Disponible' : 'Indisponible'}
                </span>
              </div>
              <p className="text-foreground text-sm mb-4 line-clamp-2">{service.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <MapPin className="h-4 w-4" />
                  {service.location}
                </div>
                <div className="text-primary font-bold">
                  {service.price_min && service.price_max
                    ? `${service.price_min.toLocaleString()} - ${service.price_max.toLocaleString()} GNF`
                    : 'Prix sur devis'}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompanyServicesTab;
