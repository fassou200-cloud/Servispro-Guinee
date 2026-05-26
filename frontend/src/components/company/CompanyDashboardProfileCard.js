import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, MapPin, Phone, Mail } from 'lucide-react';

const STATUS_BADGE = {
  approved: { label: 'Approuvée', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejetée', cls: 'bg-red-100 text-red-700' },
  pending: { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
};

const CompanyDashboardProfileCard = ({ company, backendUrl, docStatus }) => {
  const status = STATUS_BADGE[company.verification_status] || STATUS_BADGE.pending;
  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center gap-6">
        <Avatar className="h-20 w-20 ring-4 ring-primary/20">
          <AvatarImage src={company.logo ? `${backendUrl}${company.logo}` : undefined} />
          <AvatarFallback className="text-2xl font-heading bg-primary text-primary-foreground">
            <Building2 className="h-8 w-8" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-heading font-bold text-foreground">{company.company_name}</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.cls}`}>{status.label}</span>
          </div>
          <p className="text-muted-foreground">{company.sector}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {company.city}, {company.region}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="h-4 w-4" />
              {company.phone_number}
            </span>
            {company.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {company.email}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground mb-1">Documents</div>
          <div className="text-2xl font-bold text-primary">{docStatus.complete}/{docStatus.total}</div>
        </div>
      </div>
    </Card>
  );
};

export default CompanyDashboardProfileCard;
