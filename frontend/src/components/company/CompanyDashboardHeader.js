import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Home, LogOut, Clock, XCircle } from 'lucide-react';
import GuineaFlag from '@/components/GuineaFlag';

export const CompanyDashboardHeader = ({ company, onToggleOnline, onLogout, onHome }) => (
  <>
    <header className="bg-card border-b border-border sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onHome} className="gap-2">
              <Home className="h-4 w-4" />
              Accueil
            </Button>
            <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
              Espace Entreprise <GuineaFlag className="h-4 w-6" />
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Label htmlFor="online-status" className="font-heading text-xs uppercase tracking-wide">
                {company.online_status ? 'En ligne' : 'Hors ligne'}
              </Label>
              <Switch id="online-status" checked={company.online_status} onCheckedChange={onToggleOnline} />
            </div>
            <Button variant="ghost" onClick={onLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      </div>
    </header>

    {company.verification_status === 'pending' && (
      <div className="bg-amber-50 border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-amber-800 font-medium">Votre entreprise est en attente de validation</p>
              <p className="text-amber-600 text-sm">
                Vous pourrez publier des services et offres d&apos;emploi une fois approuvé par notre équipe.
              </p>
            </div>
          </div>
        </div>
      </div>
    )}

    {company.verification_status === 'rejected' && (
      <div className="bg-red-50 border-b border-red-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-red-800 font-medium">Votre entreprise a été rejetée</p>
              <p className="text-red-600 text-sm">Veuillez vérifier vos documents et contacter le support.</p>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
);
