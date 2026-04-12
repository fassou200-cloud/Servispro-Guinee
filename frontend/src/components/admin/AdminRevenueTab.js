import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Briefcase, DollarSign, Home, Loader2, MapPin, RefreshCw } from 'lucide-react';

const AdminRevenueTab = ({
  demandStats,
  loadingVisitFees,
  stats,
  visitFeesStats,
  setLoadedTabs,
  loadTabData,
  translateProfession
}) => {
  return (
    <div className="space-y-6">
      {loadingVisitFees || !visitFeesStats ? (
        <Card className="p-8 bg-slate-800 border-slate-700 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-500 mx-auto mb-2" />
          <p className="text-slate-400">Chargement des statistiques de revenus...</p>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total */}
            <Card className="p-6 bg-gradient-to-br from-green-600 to-green-700 border-0">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <span className="text-green-200 text-sm font-medium">Total Général</span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                {Number(visitFeesStats.grand_total.amount).toLocaleString('fr-FR')} GNF
              </p>
              <p className="text-green-200 text-sm">
                {visitFeesStats.grand_total.count} paiements
              </p>
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="flex justify-between text-sm">
                  <span className="text-green-200">Aujourd'hui</span>
                  <span className="text-white font-medium">
                    {Number(visitFeesStats.grand_total.today_amount).toLocaleString('fr-FR')} GNF
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-green-200">Ce mois</span>
                  <span className="text-white font-medium">
                    {Number(visitFeesStats.grand_total.this_month_amount).toLocaleString('fr-FR')} GNF
                  </span>
                </div>
              </div>
            </Card>

            {/* Locations */}
            <Card className="p-6 bg-gradient-to-br from-blue-600 to-blue-700 border-0">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Home className="h-6 w-6 text-white" />
                </div>
                <span className="text-blue-200 text-sm font-medium">Frais Visite Locations</span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                {Number(visitFeesStats.locations.total_amount).toLocaleString('fr-FR')} GNF
              </p>
              <p className="text-blue-200 text-sm">
                {visitFeesStats.locations.count} visites payées
              </p>
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-200">Aujourd'hui</span>
                  <span className="text-white font-medium">
                    {Number(visitFeesStats.locations.today_amount).toLocaleString('fr-FR')} GNF
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-blue-200">Ce mois</span>
                  <span className="text-white font-medium">
                    {Number(visitFeesStats.locations.this_month_amount).toLocaleString('fr-FR')} GNF
                  </span>
                </div>
              </div>
            </Card>

            {/* Prestataires */}
            <Card className="p-6 bg-gradient-to-br from-amber-600 to-amber-700 border-0">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Briefcase className="h-6 w-6 text-white" />
                </div>
                <span className="text-amber-200 text-sm font-medium">Frais Visite Prestataires</span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                {Number(visitFeesStats.prestataires.total_amount).toLocaleString('fr-FR')} GNF
              </p>
              <p className="text-amber-200 text-sm">
                {visitFeesStats.prestataires.count} services payés
              </p>
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="flex justify-between text-sm">
                  <span className="text-amber-200">Aujourd'hui</span>
                  <span className="text-white font-medium">
                    {Number(visitFeesStats.prestataires.today_amount).toLocaleString('fr-FR')} GNF
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-amber-200">Ce mois</span>
                  <span className="text-white font-medium">
                    {Number(visitFeesStats.prestataires.this_month_amount).toLocaleString('fr-FR')} GNF
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Demand Statistics by Profession and Location */}
          {demandStats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Demands by Profession */}
              <Card className="p-6 bg-slate-800 border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-purple-400" />
                  Demandes par Profession
                  <span className="ml-auto text-sm text-slate-400 font-normal">
                    Total: {demandStats.total_demands}
                  </span>
                </h3>
                {Object.keys(demandStats.by_profession).length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Aucune demande enregistrée</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {Object.entries(demandStats.by_profession).map(([profession, stats]) => (
                      <div key={profession} className="p-3 bg-slate-700/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-white">{translateProfession(profession)}</span>
                          <span className="text-lg font-bold text-purple-400">{stats.count}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-1 rounded bg-orange-600/20 text-orange-400">
                            En attente: {stats.pending}
                          </span>
                          <span className="px-2 py-1 rounded bg-blue-600/20 text-blue-400">
                            Acceptées: {stats.accepted}
                          </span>
                          <span className="px-2 py-1 rounded bg-green-600/20 text-green-400">
                            Terminées: {stats.completed}
                          </span>
                          <span className="px-2 py-1 rounded bg-red-600/20 text-red-400">
                            Refusées: {stats.rejected}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Demands by Location */}
              <Card className="p-6 bg-slate-800 border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-teal-400" />
                  Demandes par Localisation
                  <span className="ml-auto text-sm text-slate-400 font-normal">
                    {Object.keys(demandStats.by_location).length} zones
                  </span>
                </h3>
                {Object.keys(demandStats.by_location).length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Aucune localisation enregistrée</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {Object.entries(demandStats.by_location).map(([location, stats]) => (
                      <div key={location} className="p-3 bg-slate-700/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-white flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-teal-400" />
                            {location}
                          </span>
                          <span className="text-lg font-bold text-teal-400">{stats.count}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-1 rounded bg-orange-600/20 text-orange-400">
                            En attente: {stats.pending}
                          </span>
                          <span className="px-2 py-1 rounded bg-blue-600/20 text-blue-400">
                            Acceptées: {stats.accepted}
                          </span>
                          <span className="px-2 py-1 rounded bg-green-600/20 text-green-400">
                            Terminées: {stats.completed}
                          </span>
                          <span className="px-2 py-1 rounded bg-red-600/20 text-red-400">
                            Refusées: {stats.rejected}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Recent Payments Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Location Payments */}
            <Card className="p-6 bg-slate-800 border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Home className="h-5 w-5 text-blue-400" />
                Derniers Paiements - Locations
              </h3>
              {visitFeesStats.locations.recent_payments.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Home className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun paiement de visite location</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visitFeesStats.locations.recent_payments.map((payment, idx) => (
                    <div key={idx} className="p-3 bg-slate-700/50 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{payment.customer_name}</p>
                        <p className="text-sm text-slate-400">{payment.rental_title}</p>
                        <p className="text-xs text-slate-500">{payment.customer_phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-400">
                          {Number(payment.amount).toLocaleString('fr-FR')} GNF
                        </p>
                        <p className="text-xs text-slate-500">
                          {payment.created_at ? new Date(payment.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent Service Payments */}
            <Card className="p-6 bg-slate-800 border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-amber-400" />
                Derniers Paiements - Prestataires
              </h3>
              {visitFeesStats.prestataires.recent_payments.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun paiement de service</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visitFeesStats.prestataires.recent_payments.map((payment, idx) => (
                    <div key={idx} className="p-3 bg-slate-700/50 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{payment.customer_name}</p>
                        <p className="text-sm text-slate-400">Prestataire: {payment.provider_name}</p>
                        <p className="text-xs text-slate-500">{payment.customer_phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-400">
                          {Number(payment.amount).toLocaleString('fr-FR')} GNF
                        </p>
                        <p className="text-xs text-slate-500">
                          {payment.created_at ? new Date(payment.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Refresh Button */}
          <div className="flex justify-center">
            <Button
              onClick={() => {
                setLoadedTabs(prev => ({ ...prev, revenus: false }));
                loadTabData('revenus');
              }}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser les Statistiques
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminRevenueTab;
