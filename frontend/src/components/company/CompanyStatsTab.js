import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BarChart3, Briefcase, Users, Building, Home, Store, Eye,
  MessageCircle, TrendingUp, Loader2, RefreshCw, CheckCircle, Clock, Mail,
  DollarSign, Calendar
} from 'lucide-react';
import axios from 'axios';

const StatCard = ({ icon: Icon, label, value, subValue, colorClass = 'text-primary', bgClass = 'bg-primary/10', testId, highlight = false }) => (
  <Card className={`p-5 ${highlight ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200' : ''}`} data-testid={testId}>
    <div className="flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl ${bgClass} flex items-center justify-center shrink-0`}>
        <Icon className={`h-6 w-6 ${colorClass}`} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground truncate">{label}</p>
        <p className={`font-bold text-foreground ${highlight ? 'text-2xl' : 'text-2xl'}`}>{value}</p>
        {subValue && <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>}
      </div>
    </div>
  </Card>
);

const PERIOD_PRESETS = [
  { key: 'all', label: 'Tout', days: null },
  { key: '7d', label: '7 jours', days: 7 },
  { key: '30d', label: '30 jours', days: 30 },
  { key: '90d', label: '90 jours', days: 90 },
  { key: 'custom', label: 'Personnalisé', days: null },
];

const isoDay = (d) => d.toISOString().slice(0, 10);

const CompanyStatsTab = ({ API }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('companyToken');
      const params = {};
      if (period !== 'all') {
        if (period === 'custom') {
          if (customStart) params.start_date = customStart;
          if (customEnd) params.end_date = customEnd + 'T23:59:59';
        } else {
          const preset = PERIOD_PRESETS.find(p => p.key === period);
          if (preset && preset.days) {
            const start = new Date();
            start.setDate(start.getDate() - preset.days);
            params.start_date = start.toISOString();
          }
        }
      }
      const res = await axios.get(`${API}/company/stats`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setStats(res.data);
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    } finally {
      setLoading(false);
    }
  }, [API, period, customStart, customEnd]);

  useEffect(() => {
    // Auto-fetch when period changes (except custom — wait for explicit apply)
    if (period !== 'custom') fetchStats();
  }, [period, fetchStats]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Impossible de charger les statistiques</p>
        <Button onClick={fetchStats} className="mt-4" variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" /> Réessayer
        </Button>
      </Card>
    );
  }

  const isVerified = stats.verification_status === 'approved';
  const formatGNF = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)) + ' GNF';

  return (
    <div className="space-y-6" data-testid="company-stats-tab">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-heading font-bold text-foreground">Statistiques</h3>
            <p className="text-sm text-muted-foreground">Vue d'ensemble de votre activité sur ServisPro</p>
          </div>
        </div>
        <Button onClick={fetchStats} variant="outline" size="sm" data-testid="refresh-stats-btn" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Period Filter (only if shop exists — affects sales calc) */}
      {stats.shop && (
        <Card className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              Période ventes :
            </div>
            <div className="flex gap-2 flex-wrap">
              {PERIOD_PRESETS.map(p => (
                <Button
                  key={p.key}
                  size="sm"
                  variant={period === p.key ? 'default' : 'outline'}
                  onClick={() => setPeriod(p.key)}
                  className={period === p.key ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                  data-testid={`period-${p.key}`}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            {period === 'custom' && (
              <div className="flex items-center gap-2 flex-wrap mt-2 w-full">
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-auto"
                  data-testid="period-custom-start"
                />
                <span className="text-sm text-muted-foreground">→</span>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-auto"
                  data-testid="period-custom-end"
                />
                <Button size="sm" onClick={fetchStats} disabled={!customStart || !customEnd}>
                  Appliquer
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Verification banner */}
      {!isVerified && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-800">
              Votre entreprise n'est pas encore approuvée. Certaines statistiques resteront à zéro jusqu'à l'activation complète de votre compte.
            </p>
          </div>
        </Card>
      )}

      {/* SALES HIGHLIGHT (shop only) */}
      {stats.shop && (
        <div>
          <h4 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            Ventes Makiti
            <span className="text-xs font-normal text-muted-foreground">
              ({PERIOD_PRESETS.find(p => p.key === period)?.label || 'Personnalisé'})
            </span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={DollarSign}
              label="Montant des ventes"
              value={formatGNF(stats.shop.total_sales)}
              subValue={`${stats.shop.inquiries_processed} vente(s) traitée(s)`}
              colorClass="text-emerald-700"
              bgClass="bg-emerald-200"
              testId="stat-total-sales"
              highlight
            />
            <StatCard
              icon={CheckCircle}
              label="Demandes traitées"
              value={stats.shop.inquiries_processed}
              subValue="Demandes converties en vente"
              colorClass="text-green-600"
              bgClass="bg-green-100"
              testId="stat-inquiries-processed"
            />
            <StatCard
              icon={MessageCircle}
              label="Demandes en attente"
              value={Math.max(0, stats.shop.inquiries_total - stats.shop.inquiries_processed - stats.shop.inquiries_cancelled)}
              subValue="À traiter"
              colorClass="text-orange-600"
              bgClass="bg-orange-100"
              testId="stat-inquiries-pending"
            />
            <StatCard
              icon={TrendingUp}
              label="Taux conversion"
              value={stats.shop.inquiries_total > 0 ? `${((stats.shop.inquiries_processed / stats.shop.inquiries_total) * 100).toFixed(1)}%` : '—'}
              subValue="Traitées / Total demandes"
              colorClass="text-teal-600"
              bgClass="bg-teal-100"
              testId="stat-conversion-rate"
            />
          </div>
        </div>
      )}

      {/* Services & Jobs */}
      <div>
        <h4 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          Services & Emplois
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Briefcase}
            label="Services publiés"
            value={stats.services.total}
            subValue={`${stats.services.available} disponible(s)`}
            colorClass="text-blue-600"
            bgClass="bg-blue-100"
            testId="stat-services-total"
          />
          <StatCard
            icon={Users}
            label="Offres d'emploi"
            value={stats.jobs.total}
            subValue={`${stats.jobs.active} active(s)`}
            colorClass="text-purple-600"
            bgClass="bg-purple-100"
            testId="stat-jobs-total"
          />
          <StatCard
            icon={Mail}
            label="Candidatures reçues"
            value={stats.jobs.total_applications}
            subValue="Tous postes confondus"
            colorClass="text-pink-600"
            bgClass="bg-pink-100"
            testId="stat-applications-total"
          />
          <StatCard
            icon={CheckCircle}
            label="Statut compte"
            value={isVerified ? 'Vérifié' : 'En attente'}
            subValue={isVerified ? 'Accès complet' : 'Validation en cours'}
            colorClass={isVerified ? 'text-green-600' : 'text-amber-600'}
            bgClass={isVerified ? 'bg-green-100' : 'bg-amber-100'}
            testId="stat-verification"
          />
        </div>
      </div>

      {/* Real Estate Section */}
      {stats.real_estate && (
        <div>
          <h4 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
            <Building className="h-5 w-5 text-emerald-600" />
            Immobilier
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Home}
              label="Locations"
              value={stats.real_estate.rentals_total}
              subValue={`${stats.real_estate.rentals_available} disponible(s)`}
              colorClass="text-emerald-600"
              bgClass="bg-emerald-100"
              testId="stat-rentals"
            />
            <StatCard
              icon={Building}
              label="Ventes"
              value={stats.real_estate.sales_total}
              subValue="Propriétés à vendre"
              colorClass="text-orange-600"
              bgClass="bg-orange-100"
              testId="stat-sales"
            />
            <StatCard
              icon={Eye}
              label="Vues totales"
              value={(stats.real_estate.rentals_views + stats.real_estate.sales_views).toLocaleString('fr-FR')}
              subValue={`${stats.real_estate.rentals_views} loc. + ${stats.real_estate.sales_views} vte`}
              colorClass="text-indigo-600"
              bgClass="bg-indigo-100"
              testId="stat-property-views"
            />
            <StatCard
              icon={MessageCircle}
              label="Messages clients"
              value={stats.real_estate.rental_messages_total + stats.real_estate.sale_inquiries_total}
              subValue={`${stats.real_estate.rental_messages_unread + stats.real_estate.sale_inquiries_pending} non lu(s)`}
              colorClass="text-rose-600"
              bgClass="bg-rose-100"
              testId="stat-property-messages"
            />
          </div>
        </div>
      )}

      {/* Shop (Makiti) Section */}
      {stats.shop && (
        <div>
          <h4 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
            <Store className="h-5 w-5 text-orange-600" />
            Ma Boutique Makiti
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Store}
              label="Produits en vente"
              value={stats.shop.products_total}
              subValue={`${stats.shop.products_available} disponible(s)`}
              colorClass="text-orange-600"
              bgClass="bg-orange-100"
              testId="stat-shop-products"
            />
            <StatCard
              icon={Eye}
              label="Vues produits"
              value={stats.shop.total_views.toLocaleString('fr-FR')}
              subValue="Toutes annonces"
              colorClass="text-cyan-600"
              bgClass="bg-cyan-100"
              testId="stat-shop-views"
            />
            <StatCard
              icon={MessageCircle}
              label="Demandes totales"
              value={stats.shop.inquiries_total}
              subValue={`${stats.shop.inquiries_unread} non lue(s)`}
              colorClass="text-fuchsia-600"
              bgClass="bg-fuchsia-100"
              testId="stat-shop-inquiries"
            />
            <StatCard
              icon={TrendingUp}
              label="Taux d'engagement"
              value={stats.shop.total_views > 0 ? `${((stats.shop.inquiries_total / stats.shop.total_views) * 100).toFixed(1)}%` : '—'}
              subValue="Demandes / Vues"
              colorClass="text-teal-600"
              bgClass="bg-teal-100"
              testId="stat-shop-engagement"
            />
          </div>
        </div>
      )}

      {/* Top Categories */}
      {stats.services.top_categories.length > 0 && (
        <Card className="p-6" data-testid="top-categories-card">
          <h4 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Vos catégories de services
          </h4>
          <div className="space-y-3">
            {stats.services.top_categories.map((cat) => {
              const maxCount = Math.max(...stats.services.top_categories.map(c => c.count));
              const percent = (cat.count / maxCount) * 100;
              return (
                <div key={cat.category}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-foreground">{cat.category}</span>
                    <span className="text-sm text-muted-foreground">{cat.count} service(s)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {stats.services.total === 0 && stats.jobs.total === 0 && !stats.real_estate?.rentals_total && !stats.shop?.products_total && (
        <Card className="p-12 text-center">
          <BarChart3 className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Aucune activité à afficher</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Commencez par publier vos premiers services, offres d'emploi ou annonces. Les statistiques apparaîtront ici en temps réel.
          </p>
        </Card>
      )}
    </div>
  );
};

export default CompanyStatsTab;
