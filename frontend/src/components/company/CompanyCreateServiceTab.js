import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';

const CompanyCreateServiceTab = ({
  COMPANY_SECTORS,
  company,
  handleCreateService,
  serviceForm,
  services,
  setServiceForm
}) => {
  return (
    <Card className="p-8">
      <h3 className="text-2xl font-heading font-bold text-foreground mb-6">
        Créer un Nouveau Service
      </h3>

      {company.verification_status !== 'approved' ? (
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <p className="text-muted-foreground">
            Vous devez être approuvé pour publier des services.
          </p>
        </div>
      ) : (
        <form onSubmit={handleCreateService} className="space-y-6">
          <div className="space-y-2">
            <Label>Titre du Service *</Label>
            <Input
              value={serviceForm.title}
              onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
              required
              placeholder="Ex: Construction de bâtiments"
            />
          </div>

          <div className="space-y-2">
            <Label>Catégorie *</Label>
            <Select value={serviceForm.category} onValueChange={(v) => setServiceForm({ ...serviceForm, category: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {COMPANY_SECTORS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={serviceForm.description}
              onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
              required
              rows={4}
              placeholder="Décrivez votre service..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prix Minimum (GNF)</Label>
              <Input
                type="number"
                value={serviceForm.price_min}
                onChange={(e) => setServiceForm({ ...serviceForm, price_min: e.target.value })}
                placeholder="100000"
              />
            </div>
            <div className="space-y-2">
              <Label>Prix Maximum (GNF)</Label>
              <Input
                type="number"
                value={serviceForm.price_max}
                onChange={(e) => setServiceForm({ ...serviceForm, price_max: e.target.value })}
                placeholder="500000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Localisation *</Label>
            <Input
              value={serviceForm.location}
              onChange={(e) => setServiceForm({ ...serviceForm, location: e.target.value })}
              required
              placeholder="Conakry, Guinée"
            />
          </div>

          <Button type="submit" className="w-full">
            Créer le Service
          </Button>
        </form>
      )}
    </Card>
  );
};

export default CompanyCreateServiceTab;
