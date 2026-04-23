import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExternalLink, Shield, User } from 'lucide-react';

const CompanyProfileTab = ({
  API,
  changingPassword,
  company,
  passwordForm,
  setChangingPassword,
  setPasswordForm
}) => {
  return (
    <Card className="p-8">
      <h3 className="text-2xl font-heading font-bold text-foreground mb-6">
        Informations de l'Entreprise
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label className="text-muted-foreground text-sm">Nom de l'Entreprise</Label>
          <p className="text-foreground font-medium text-lg">{company.company_name}</p>
        </div>
        <div>
          <Label className="text-muted-foreground text-sm">Secteur d'Activité</Label>
          <p className="text-foreground font-medium">{company.sector}</p>
        </div>
        <div>
          <Label className="text-muted-foreground text-sm">Numéro RCCM</Label>
          <p className="text-foreground font-mono">{company.rccm_number}</p>
        </div>
        <div>
          <Label className="text-muted-foreground text-sm">Numéro NIF</Label>
          <p className="text-foreground font-mono">{company.nif_number || '-'}</p>
        </div>
        <div className="md:col-span-2">
          <Label className="text-muted-foreground text-sm">Adresse</Label>
          <p className="text-foreground">{company.address}, {company.city}, {company.region}</p>
        </div>
        <div>
          <Label className="text-muted-foreground text-sm">Téléphone</Label>
          <p className="text-foreground">{company.phone_number}</p>
        </div>
        <div>
          <Label className="text-muted-foreground text-sm">Email</Label>
          <p className="text-foreground">{company.email || '-'}</p>
        </div>
        {company.website && (
          <div className="md:col-span-2">
            <Label className="text-muted-foreground text-sm">Site Web</Label>
            <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
              {company.website} <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}
        <div className="md:col-span-2">
          <Label className="text-muted-foreground text-sm">Description</Label>
          <p className="text-foreground">{company.description}</p>
        </div>
      </div>

      {/* Contact Person */}
      <div className="mt-8 p-6 bg-muted rounded-xl">
        <h4 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Personne de Contact
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground text-sm">Nom</Label>
            <p className="text-foreground font-medium">{company.contact_person_name}</p>
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">Téléphone</Label>
            <p className="text-foreground">{company.contact_person_phone}</p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="mt-8 p-6 bg-muted rounded-xl">
        <h4 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Changer le mot de passe
        </h4>
        <div className="space-y-4 max-w-md">
          <div>
            <Label className="text-muted-foreground text-sm">Mot de passe actuel</Label>
            <Input
              type="password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
              placeholder="Votre mot de passe actuel"
              data-testid="current-password-input"
            />
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">Nouveau mot de passe</Label>
            <Input
              type="password"
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
              placeholder="Nouveau mot de passe (min. 6 caractères)"
              data-testid="new-password-input"
            />
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">Confirmer le nouveau mot de passe</Label>
            <Input
              type="password"
              value={passwordForm.confirm_password}
              onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
              placeholder="Confirmer le nouveau mot de passe"
              data-testid="confirm-password-input"
            />
          </div>
          <Button
            onClick={async () => {
              if (!passwordForm.current_password || !passwordForm.new_password) {
                toast.error('Veuillez remplir tous les champs');
                return;
              }
              if (passwordForm.new_password !== passwordForm.confirm_password) {
                toast.error('Les mots de passe ne correspondent pas');
                return;
              }
              if (passwordForm.new_password.length < 6) {
                toast.error('Le nouveau mot de passe doit contenir au moins 6 caractères');
                return;
              }
              setChangingPassword(true);
              try {
                const token = localStorage.getItem('companyToken');
                await axios.put(`${API}/company/change-password`, {
                  current_password: passwordForm.current_password,
                  new_password: passwordForm.new_password
                }, { headers: { Authorization: `Bearer ${token}` } });
                toast.success('Mot de passe modifié avec succès');
                setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
              } catch (err) {
                toast.error(err.response?.data?.detail || 'Erreur lors du changement de mot de passe');
              } finally {
                setChangingPassword(false);
              }
            }}
            disabled={changingPassword}
            className="gap-2"
            data-testid="change-password-btn"
          >
            {changingPassword ? 'Modification...' : 'Modifier le mot de passe'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default CompanyProfileTab;
