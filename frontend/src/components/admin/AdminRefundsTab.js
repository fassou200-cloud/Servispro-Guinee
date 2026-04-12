import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Banknote, CheckCircle, Loader2, RefreshCw, Wallet, XCircle } from 'lucide-react';

const AdminRefundsTab = ({ loadingRefunds, processingRefund, refundRequests, fetchRefundRequests, handleRefundDecision }) => {
  return (
    <div className="space-y-6">
      <Card className="p-6 bg-slate-800 border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
            <Banknote className="h-6 w-6 text-orange-400" />
            Demandes de Remboursement
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRefundRequests}
            disabled={loadingRefunds}
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingRefunds ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {loadingRefunds ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-2" />
            <p className="text-slate-400">Chargement des demandes...</p>
          </div>
        ) : refundRequests.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-4">
              <Wallet className="h-8 w-8 text-slate-500" />
            </div>
            <p className="text-slate-400">Aucune demande de remboursement</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pending Requests */}
            {refundRequests.filter(r => r.status === 'pending').length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-orange-400 mb-3">
                  En attente ({refundRequests.filter(r => r.status === 'pending').length})
                </h3>
                <div className="space-y-3">
                  {refundRequests.filter(r => r.status === 'pending').map((request) => (
                    <div key={request.id} className="p-4 bg-slate-700/50 rounded-xl border border-orange-500/30">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-white text-lg">{request.amount.toLocaleString('fr-FR')} GNF</p>
                          <p className="text-slate-300">{request.customer_name}</p>
                          <p className="text-slate-400 text-sm">{request.customer_phone}</p>
                          <p className="text-slate-400 text-sm mt-2 p-2 bg-slate-800 rounded">
                            <strong>Raison:</strong> {request.reason}
                          </p>
                          <p className="text-slate-500 text-xs mt-2">
                            {new Date(request.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleRefundDecision(request.id, 'approved', 'Remboursement effectué')}
                            disabled={processingRefund === request.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {processingRefund === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approuver
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRefundDecision(request.id, 'rejected', 'Demande non conforme')}
                            disabled={processingRefund === request.id}
                            className="border-red-500 text-red-400 hover:bg-red-500/20"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Refuser
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Processed Requests */}
            {refundRequests.filter(r => r.status !== 'pending').length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-slate-400 mb-3">
                  Historique ({refundRequests.filter(r => r.status !== 'pending').length})
                </h3>
                <div className="space-y-2">
                  {refundRequests.filter(r => r.status !== 'pending').map((request) => (
                    <div key={request.id} className={`p-4 rounded-xl border ${
                      request.status === 'approved'
                        ? 'bg-green-900/20 border-green-700/30'
                        : 'bg-red-900/20 border-red-700/30'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white">{request.amount.toLocaleString('fr-FR')} GNF</p>
                          <p className="text-slate-400 text-sm">{request.customer_name} - {request.customer_phone}</p>
                          <p className="text-slate-500 text-xs mt-1">{request.reason}</p>
                          {request.admin_note && (
                            <p className="text-slate-400 text-xs mt-1">Note: {request.admin_note}</p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          request.status === 'approved'
                            ? 'bg-green-600/30 text-green-400'
                            : 'bg-red-600/30 text-red-400'
                        }`}>
                          {request.status === 'approved' ? '✓ Approuvé' : '✗ Refusé'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminRefundsTab;
