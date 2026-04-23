import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';

const CompanyCreateJobTab = ({ CONTRACT_TYPES, company, handleCreateJobOffer, jobForm, setJobForm }) => {
  return (
    <Card className="p-8">
      <h3 className="text-2xl font-heading font-bold text-foreground mb-6">
        Publier une Offre d'Emploi
      </h3>

      {company.verification_status !== 'approved' ? (
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <p className="text-muted-foreground">
            Vous devez être approuvé pour publier des offres d'emploi.
          </p>
        </div>
      ) : (
        <form onSubmit={handleCreateJobOffer} className="space-y-6">
          <div className="space-y-2">
            <Label>Titre du Poste *</Label>
            <Input
              value={jobForm.title}
              onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
              required
              placeholder="Ex: Ingénieur Civil"
            />
          </div>

          <div className="space-y-2">
            <Label>Type de Contrat *</Label>
            <Select value={jobForm.contract_type} onValueChange={(v) => setJobForm({ ...jobForm, contract_type: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez le type de contrat" />
              </SelectTrigger>
              <SelectContent>
                {CONTRACT_TYPES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description du Poste *</Label>
            <Textarea
              value={jobForm.description}
              onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
              required
              rows={4}
              placeholder="Décrivez les responsabilités et missions..."
            />
          </div>

          <div className="space-y-2">
            <Label>Exigences / Qualifications *</Label>
            <Textarea
              value={jobForm.requirements}
              onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
              required
              rows={3}
              placeholder="Ex: Bac+5 en génie civil, 3 ans d'expérience..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Salaire Minimum (GNF/mois)</Label>
              <Input
                type="number"
                value={jobForm.salary_min}
                onChange={(e) => setJobForm({ ...jobForm, salary_min: e.target.value })}
                placeholder="3000000"
              />
            </div>
            <div className="space-y-2">
              <Label>Salaire Maximum (GNF/mois)</Label>
              <Input
                type="number"
                value={jobForm.salary_max}
                onChange={(e) => setJobForm({ ...jobForm, salary_max: e.target.value })}
                placeholder="5000000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Localisation *</Label>
              <Input
                value={jobForm.location}
                onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                required
                placeholder="Conakry, Guinée"
              />
            </div>
            <div className="space-y-2">
              <Label>Date Limite de Candidature</Label>
              <Input
                type="date"
                value={jobForm.deadline}
                onChange={(e) => setJobForm({ ...jobForm, deadline: e.target.value })}
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            Publier l'Offre
          </Button>
        </form>
      )}
    </Card>
  );
};

export default CompanyCreateJobTab;
