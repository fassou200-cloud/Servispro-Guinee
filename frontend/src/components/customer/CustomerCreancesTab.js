import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Wallet, Banknote, X, Send, AlertTriangle, User, RefreshCw,
  Loader2, CreditCard, Building, Shield
} from 'lucide-react';

export const CustomerCreancesTab = ({
  balance,
  loadingBalance,
  creditHistory,
  refundRequests,
  showRefundForm,
  setShowRefundForm,
  refundAmount,
  setRefundAmount,
  refundReason,
  setRefundReason,
  requestRefund,
  fetchCreditHistory,
}) => {
  return (
    <div className="space-y-6">
      {/* Balance Card with Refund Button */}
      <Card className="p-6 rounded-2xl border-0 shadow-lg bg-gradient-to-br from-purple-600 to-indigo-700 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-200 text-sm mb-1">Votre Solde de Créances</p>
            <p className="text-4xl font-bold">{balance.toLocaleString('fr-FR')} GNF</p>
            <p className="text-purple-200 text-sm mt-2">
              Utilisable pour vos prochains paiements
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
              <Wallet className="h-10 w-10 text-white" />
            </div>
            {balance > 0 && (
              <Button
                onClick={() => setShowRefundForm(true)}
                className="bg-white text-purple-700 hover:bg-purple-100 text-sm"
                size="sm"
              >
                <Banknote className="h-4 w-4 mr-1" />
                Demander remboursement
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Refund Request Form */}
      {showRefundForm && (
        <Card className="p-6 rounded-2xl border-0 shadow-lg bg-white border-2 border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Demande de Remboursement</h3>
            <button onClick={() => setShowRefundForm(false)} className="p-1 hover:bg-gray-100 rounded-full">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant à rembourser (GNF)</label>
              <input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                max={balance}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={`Maximum: ${balance.toLocaleString('fr-FR')} GNF`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Raison de la demande</label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={3}
                placeholder="Expliquez pourquoi vous souhaitez un remboursement..."
              />
            </div>
            <Button
              onClick={() => requestRefund(refundAmount, refundReason)}
              disabled={!refundAmount || parseFloat(refundAmount) <= 0 || parseFloat(refundAmount) > balance || !refundReason}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Envoyer la demande
            </Button>
          </div>
        </Card>
      )}

      {/* Pending Refund Requests */}
      {refundRequests.length > 0 && (
        <Card className="p-6 rounded-2xl border-0 shadow-lg bg-white">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Mes Demandes de Remboursement</h3>
          <div className="space-y-3">
            {refundRequests.map((request) => (
              <div
                key={request.id}
                className={`p-4 rounded-xl border ${
                  request.status === 'pending' ? 'bg-yellow-50 border-yellow-200' :
                  request.status === 'approved' ? 'bg-green-50 border-green-200' :
                  'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{request.amount.toLocaleString('fr-FR')} GNF</p>
                    <p className="text-sm text-gray-500 mt-1">{request.reason}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(request.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    request.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {request.status === 'pending' ? 'En attente' :
                     request.status === 'approved' ? 'Approuvé' : 'Refusé'}
                  </span>
                </div>
                {request.admin_note && (
                  <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200">
                    <strong>Note admin:</strong> {request.admin_note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 rounded-2xl border-0 shadow-md bg-amber-50 border-l-4 border-amber-500">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h4 className="font-semibold text-amber-800">Visite refusée</h4>
              <p className="text-sm text-amber-700 mt-1">
                Si un propriétaire refuse votre demande de visite après paiement,
                le montant est automatiquement crédité sur votre solde.
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5 rounded-2xl border-0 shadow-md bg-red-50 border-l-4 border-red-500">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h4 className="font-semibold text-red-800">Prestataire absent</h4>
              <p className="text-sm text-red-700 mt-1">
                Si un prestataire ne se présente pas après paiement,
                signalez-le pour récupérer votre crédit.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Credit History */}
      <Card className="p-6 rounded-2xl border-0 shadow-lg bg-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-heading font-bold text-gray-900">Historique des Créances</h3>
            <p className="text-sm text-gray-500">Vos transactions de crédit</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCreditHistory}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </div>

        {loadingBalance ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : creditHistory.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500">Aucune transaction de crédit pour le moment</p>
            <p className="text-sm text-gray-400 mt-1">
              Les créances apparaîtront ici lorsqu'un remboursement sera effectué
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {creditHistory.map((transaction) => {
              const isRefusal = ['visit_rejected', 'provider_no_show', 'used_for_payment'].includes(transaction.transaction_type) || transaction.amount < 0;
              const bgColor = isRefusal ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200';
              const iconBgColor = isRefusal ? 'bg-red-100' : 'bg-green-100';
              const iconColor = isRefusal ? 'text-red-600' : 'text-green-600';
              const amountColor = isRefusal ? 'text-red-600' : 'text-green-600';

              return (
                <div
                  key={transaction.id}
                  className={`flex items-center justify-between p-4 rounded-xl border ${bgColor}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBgColor}`}>
                      {transaction.transaction_type === 'visit_rejected' && (
                        <Building className={`h-5 w-5 ${iconColor}`} />
                      )}
                      {transaction.transaction_type === 'provider_no_show' && (
                        <User className={`h-5 w-5 ${iconColor}`} />
                      )}
                      {transaction.transaction_type === 'used_for_payment' && (
                        <CreditCard className={`h-5 w-5 ${iconColor}`} />
                      )}
                      {transaction.transaction_type === 'admin_adjustment' && (
                        <Shield className={`h-5 w-5 ${iconColor}`} />
                      )}
                      {!['visit_rejected', 'provider_no_show', 'used_for_payment', 'admin_adjustment'].includes(transaction.transaction_type) && (
                        <Wallet className={`h-5 w-5 ${iconColor}`} />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {transaction.transaction_type === 'visit_rejected' && '❌ Visite refusée'}
                        {transaction.transaction_type === 'provider_no_show' && '❌ Prestataire absent'}
                        {transaction.transaction_type === 'used_for_payment' && '💳 Utilisé pour paiement'}
                        {transaction.transaction_type === 'admin_adjustment' && (transaction.amount > 0 ? '✅ Crédit admin' : '❌ Débit admin')}
                        {transaction.transaction_type === 'refund' && '✅ Remboursement'}
                      </p>
                      <p className="text-sm text-gray-500 truncate max-w-xs">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(transaction.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${amountColor}`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString('fr-FR')} GNF
                    </p>
                    <p className="text-xs text-gray-400">
                      Solde: {transaction.balance_after.toLocaleString('fr-FR')} GNF
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
