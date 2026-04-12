import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, Building, CheckCircle, DollarSign, Eye, Home, Loader2, RefreshCw, Save, Settings, Sparkles, TrendingUp } from 'lucide-react';

const AdminSettingsTab = ({
  commissionRevenue,
  loadedTabs,
  savingFees,
  savingSettings,
  serviceFees,
  settings,
  tabLoading,
  setSettings,
  handleSaveServiceFees,
  handleSaveSettings,
  handleUpdateFee,
  refreshTabData,
  deviseOptions
}) => {
  return (
    <div className="space-y-6">
      {tabLoading && !loadedTabs['settings'] ? (
        <Card className="p-8 bg-slate-800 border-slate-700 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-2" />
          <p className="text-slate-400">Chargement des paramètres...</p>
        </Card>
      ) : (
        <>
          {/* Commission Revenue Card */}
          <Card className="p-6 bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border-purple-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-purple-400" />
                Revenus de Commission
              </h2>
              <span className="text-sm text-purple-300 bg-purple-800/50 px-3 py-1 rounded-full">
                {commissionRevenue?.period || '30 derniers jours'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <p className="text-sm text-slate-400 mb-1">Transactions</p>
                <p className="text-2xl font-bold text-white">
                  {commissionRevenue?.total_transactions || 0}
                </p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <p className="text-sm text-slate-400 mb-1">Ventes</p>
                <p className="text-2xl font-bold text-white">
                  {commissionRevenue?.total_sales || 0}
                </p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <p className="text-sm text-slate-400 mb-1">Locations</p>
                <p className="text-2xl font-bold text-white">
                  {commissionRevenue?.total_rentals || 0}
                </p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <p className="text-sm text-slate-400 mb-1">Volume Total</p>
                <p className="text-xl font-bold text-white">
                  {((commissionRevenue?.total_volume_payments || 0) + (commissionRevenue?.total_volume_sales || 0)).toLocaleString('fr-FR')} <span className="text-xs text-slate-400">{commissionRevenue?.devise || settings.devise}</span>
                </p>
              </div>
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-lg">
                <p className="text-sm text-purple-200 mb-1">Total Commission</p>
                <p className="text-2xl font-bold text-white">
                  {(commissionRevenue?.total_commission || 0).toLocaleString('fr-FR')} <span className="text-sm text-purple-200">{commissionRevenue?.devise || settings.devise}</span>
                </p>
              </div>
            </div>

            {/* Commission Breakdown by Domain */}
            <div className="mt-4 pt-4 border-t border-purple-700/50">
              <p className="text-sm text-slate-400 mb-3">Commissions sur les ventes immobilières:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-800/30 p-3 rounded-lg">
                  <span className="text-amber-400 font-semibold block">Vente Immobilière</span>
                  <span className="text-white font-bold">{(commissionRevenue?.commission_breakdown?.vente || 0).toLocaleString('fr-FR')} {commissionRevenue?.devise || settings.devise}</span>
                  <span className="text-slate-500 text-xs block">({commissionRevenue?.transaction_counts?.vente || 0} ventes)</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Settings Form */}
          <Card className="p-6 bg-slate-800 border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
                <Settings className="h-6 w-6 text-purple-400" />
                Paramètres des Commissions
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refreshTabData('settings')}
                disabled={tabLoading}
                className="text-slate-400 hover:text-white"
              >
                <RefreshCw className={`h-4 w-4 ${tabLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Currency Selection */}
            <div className="mb-6 p-4 bg-slate-700/50 rounded-lg">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4 text-amber-400" />
                Devise
              </label>
              <div className="flex gap-2 flex-wrap">
                {deviseOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSettings({...settings, devise: option.value})}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      settings.devise === option.value
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Commission Vente immobilière (%) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Building className="h-4 w-4 text-amber-400" />
                  Vente immobilière
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={settings.commission_vente}
                    onChange={(e) => setSettings({...settings, commission_vente: e.target.value})}
                    className="w-full h-12 px-4 pr-12 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400 font-bold">%</span>
                </div>
                <p className="text-xs text-slate-500">Commission sur les ventes immobilières</p>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 pt-6 border-t border-slate-700 flex justify-end">
              <Button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="bg-purple-600 hover:bg-purple-700 gap-2 px-6"
              >
                {savingSettings ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Enregistrer les Paramètres
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Current Rates Summary */}
          <Card className="p-4 bg-slate-800/50 border-slate-700">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <AlertCircle className="h-4 w-4" />
              <span>
                Taux actuel:
                Vente immobilière <span className="text-amber-400 font-semibold">{commissionRevenue?.rates?.commission_vente || settings.commission_vente}%</span>
              </span>
            </div>
          </Card>

          {/* Frais d'Annonces Immobilières */}
          <Card className="p-6 bg-slate-800 border-slate-700 mt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
                <Home className="h-6 w-6 text-green-400" />
                Tarifs Annonces Immobilières
              </h2>
            </div>

            <p className="text-sm text-slate-400 mb-4">
              Configurez les frais d'annonces pour les agents et propriétaires immobiliers. Les premières annonces sont gratuites.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Annonces Gratuites */}
              <div className="space-y-2">
                <label className="text-sm text-slate-400 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-400" />
                  Annonces Gratuites
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={settings.annonces_gratuites || 3}
                    onChange={(e) => setSettings({...settings, annonces_gratuites: e.target.value})}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 text-lg font-bold"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">premières</span>
                </div>
                <p className="text-xs text-green-400">Nombre d'annonces gratuites par agent</p>
              </div>

              {/* Frais Annonce Location */}
              <div className="space-y-2">
                <label className="text-sm text-slate-400 flex items-center gap-2">
                  <Building className="h-4 w-4 text-blue-400" />
                  Frais Annonce Location
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={settings.frais_annonce_location || 50000}
                    onChange={(e) => setSettings({...settings, frais_annonce_location: e.target.value})}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 text-lg font-bold"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{settings.devise}</span>
                </div>
                <p className="text-xs text-blue-400">Par annonce de location (après gratuites)</p>
              </div>

              {/* Frais Annonce Vente */}
              <div className="space-y-2">
                <label className="text-sm text-slate-400 flex items-center gap-2">
                  <Home className="h-4 w-4 text-purple-400" />
                  Frais Annonce Vente
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={settings.frais_annonce_vente || 100000}
                    onChange={(e) => setSettings({...settings, frais_annonce_vente: e.target.value})}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 text-lg font-bold"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{settings.devise}</span>
                </div>
                <p className="text-xs text-purple-400">Par annonce de vente (après gratuites)</p>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-4 p-4 bg-green-900/20 border border-green-700 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                <div>
                  <p className="text-green-400 font-medium">Politique actuelle</p>
                  <p className="text-sm text-slate-300 mt-1">
                    Les {settings.annonces_gratuites || 3} premières annonces sont <strong>gratuites</strong>.
                    Ensuite, chaque annonce de location coûte <strong>{(settings.frais_annonce_location || 50000).toLocaleString()} {settings.devise}</strong> et
                    chaque annonce de vente coûte <strong>{(settings.frais_annonce_vente || 100000).toLocaleString()} {settings.devise}</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end mt-6">
              <Button
                data-testid="save-real-estate-fees-btn"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                {savingSettings ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Enregistrer les Tarifs Immobiliers
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Service Fees by Profession */}
          <Card className="p-6 bg-slate-800 border-slate-700 mt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-blue-400" />
                Frais de Déplacement par Profession
              </h2>
              <Button
                onClick={handleSaveServiceFees}
                disabled={savingFees}
                className="bg-blue-600 hover:bg-blue-700 gap-2"
              >
                {savingFees ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Enregistrer les Frais
                  </>
                )}
              </Button>
            </div>

            <p className="text-sm text-slate-400 mb-4">
              Définissez les frais de déplacement pour chaque catégorie de métier. Ces frais seront affichés aux clients et prestataires.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Profession</th>
                    <th className="text-center py-3 px-4 text-slate-300 font-medium">
                      <div className="flex items-center justify-center gap-2">
                        <Eye className="h-4 w-4 text-blue-400" />
                        Frais de Déplacement ({settings.devise})
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {serviceFees.filter(fee =>
                    !['Electrician', 'Mechanic', 'Plumber', 'Logistics', 'Other'].includes(fee.profession)
                  ).map((fee) => (
                    <tr key={fee.profession} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-4">
                        <span className="text-white font-medium">{fee.label || fee.profession}</span>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={fee.frais_visite || 0}
                          onChange={(e) => handleUpdateFee(fee.profession, 'frais_visite', e.target.value)}
                          className="w-full max-w-[200px] mx-auto block h-10 px-3 bg-slate-700 border border-slate-600 rounded-lg text-white text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
              <div className="flex items-start gap-2 text-sm text-blue-300">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">À propos des frais de visite :</p>
                  <p className="mt-1 text-blue-400 text-xs">
                    Les frais de visite sont payés par le client avant le déplacement du prestataire. Ce montant est défini par la plateforme pour chaque catégorie de métier.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminSettingsTab;
