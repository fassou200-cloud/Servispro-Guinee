import { Button } from '@/components/ui/button';
import { User, FileText, Briefcase, Plus, Home, Building, MessageCircle, Store, BarChart3 } from 'lucide-react';

const CompanyDashboardTabsNav = ({
  activeTab, setActiveTab,
  isRealEstateSector, isApproved,
  rentals = [], sales = [], propertyMessages = [], interimBadge = {},
  setRentalStep, setSaleStep,
}) => (
  <div className="flex gap-2 mb-6 flex-wrap">
    <Button variant={activeTab === 'profile' ? 'default' : 'outline'} onClick={() => setActiveTab('profile')} className="gap-2" data-testid="tab-profile">
      <User className="h-4 w-4" /> Profil
    </Button>
    <Button variant={activeTab === 'documents' ? 'default' : 'outline'} onClick={() => setActiveTab('documents')} className="gap-2" data-testid="tab-documents">
      <FileText className="h-4 w-4" /> Documents
    </Button>

    {isRealEstateSector && (
      <>
        <Button variant={activeTab === 'rentals' ? 'default' : 'outline'} onClick={() => setActiveTab('rentals')} className="gap-2 bg-emerald-50 border-emerald-200 hover:bg-emerald-100" data-testid="tab-rentals">
          <Home className="h-4 w-4 text-emerald-600" /> Locations ({rentals.length})
        </Button>
        <Button variant={activeTab === 'create-rental' ? 'default' : 'outline'} onClick={() => { setActiveTab('create-rental'); setRentalStep(1); }} className="gap-2 bg-emerald-50 border-emerald-200 hover:bg-emerald-100" disabled={!isApproved} data-testid="tab-create-rental">
          <Plus className="h-4 w-4 text-emerald-600" /> + Location
        </Button>
        <Button variant={activeTab === 'sales' ? 'default' : 'outline'} onClick={() => setActiveTab('sales')} className="gap-2 bg-orange-50 border-orange-200 hover:bg-orange-100" data-testid="tab-sales">
          <Building className="h-4 w-4 text-orange-600" /> Ventes ({sales.length})
        </Button>
        <Button variant={activeTab === 'create-sale' ? 'default' : 'outline'} onClick={() => { setActiveTab('create-sale'); setSaleStep(1); }} className="gap-2 bg-orange-50 border-orange-200 hover:bg-orange-100" disabled={!isApproved} data-testid="tab-create-sale">
          <Plus className="h-4 w-4 text-orange-600" /> + Vendre
        </Button>
        <Button variant={activeTab === 'property-messages' ? 'default' : 'outline'} onClick={() => setActiveTab('property-messages')} className="gap-2 bg-blue-50 border-blue-200 hover:bg-blue-100" data-testid="tab-property-messages">
          <MessageCircle className="h-4 w-4 text-blue-600" /> Messages ({propertyMessages.filter(m => !m.is_read).length})
        </Button>
      </>
    )}

    <Button variant={activeTab === 'services' ? 'default' : 'outline'} onClick={() => setActiveTab('services')} className="gap-2" data-testid="tab-services">
      <Briefcase className="h-4 w-4" /> Services
    </Button>
    <Button variant={activeTab === 'create-service' ? 'default' : 'outline'} onClick={() => setActiveTab('create-service')} className="gap-2" disabled={!isApproved} data-testid="tab-create-service">
      <Plus className="h-4 w-4" /> + Service
    </Button>
    <Button variant={activeTab === 'my-shop' ? 'default' : 'outline'} onClick={() => setActiveTab('my-shop')} className={`gap-2 ${activeTab === 'my-shop' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-orange-50 border-orange-200 hover:bg-orange-100'}`} data-testid="tab-my-shop">
      <Store className="h-4 w-4 text-orange-500" /> Ma Boutique
    </Button>
    <Button variant={activeTab === 'stats' ? 'default' : 'outline'} onClick={() => setActiveTab('stats')} className={`gap-2 ${activeTab === 'stats' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'}`} data-testid="tab-stats">
      <BarChart3 className="h-4 w-4 text-indigo-600" /> Statistiques
    </Button>
    <Button variant={activeTab === 'interim' ? 'default' : 'outline'} onClick={() => setActiveTab('interim')} className={`gap-2 relative ${activeTab === 'interim' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'}`} data-testid="tab-interim">
      <Briefcase className="h-4 w-4 text-emerald-600" /> Intérim
      {interimBadge.pending_applications > 0 && (
        <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold" data-testid="company-badge-applications">
          {interimBadge.pending_applications}
        </span>
      )}
    </Button>
  </div>
);

export default CompanyDashboardTabsNav;
