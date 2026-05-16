import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Ban, CheckCircle, ChevronLeft, ChevronRight, Eye, Power, Trash2 } from 'lucide-react';

const AdminCustomersTab = ({
  customerPage,
  customers,
  selectedCustomer,
  setCustomerPage,
  setSelectedCustomer,
  sortedAndPaginatedCustomers,
  customerActiveFilter,
  setCustomerActiveFilter,
  confirmDelete,
  handleToggleCustomerActive
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h2 className="text-lg font-heading font-bold text-white">
            Liste des Clients ({sortedAndPaginatedCustomers.totalItems})
            {sortedAndPaginatedCustomers.inactiveCount > 0 && (
              <span className="ml-2 text-xs font-medium text-red-300 bg-red-500/20 border border-red-500/40 px-2 py-0.5 rounded-full">
                {sortedAndPaginatedCustomers.inactiveCount} désactivé(s)
              </span>
            )}
          </h2>
        </div>
        <div className="flex gap-1 mb-3">
          {[
            { key: 'all', label: 'Tous' },
            { key: 'active', label: 'Actifs' },
            { key: 'inactive', label: 'Désactivés' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setCustomerActiveFilter(opt.key)}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                customerActiveFilter === opt.key
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
              data-testid={`customers-filter-${opt.key}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {customers.length === 0 ? (
          <Card className="p-8 bg-slate-800 border-slate-700 text-center">
            <p className="text-slate-400">Aucun client inscrit</p>
          </Card>
        ) : (
          <>
            <div className="space-y-2">
              {sortedAndPaginatedCustomers.items.map((customer) => (
                <Card
                  key={customer.id}
                  className={`p-4 bg-slate-800 border-slate-700 cursor-pointer transition-colors ${
                    selectedCustomer?.id === customer.id ? 'border-amber-500' : 'hover:border-slate-600'
                  }`}
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-slate-700 text-white">
                        {customer.first_name[0]}{customer.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-bold text-white">{customer.first_name} {customer.last_name}</h3>
                      <p className="text-sm text-slate-400">{customer.phone_number}</p>
                    </div>
                    {customer.is_active === false && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-red-900/50 text-red-400 border border-red-700">
                        Désactivé
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination Controls */}
            {sortedAndPaginatedCustomers.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
                <p className="text-sm text-slate-400">
                  Page {sortedAndPaginatedCustomers.currentPage} sur {sortedAndPaginatedCustomers.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomerPage(p => Math.max(1, p - 1))}
                    disabled={customerPage === 1}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Précédent
                  </Button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, sortedAndPaginatedCustomers.totalPages) }, (_, i) => {
                      let pageNum;
                      if (sortedAndPaginatedCustomers.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (customerPage <= 3) {
                        pageNum = i + 1;
                      } else if (customerPage >= sortedAndPaginatedCustomers.totalPages - 2) {
                        pageNum = sortedAndPaginatedCustomers.totalPages - 4 + i;
                      } else {
                        pageNum = customerPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={customerPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCustomerPage(pageNum)}
                          className={customerPage === pageNum
                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                            : "border-slate-600 text-slate-300 hover:bg-slate-700"
                          }
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomerPage(p => Math.min(sortedAndPaginatedCustomers.totalPages, p + 1))}
                    disabled={customerPage === sortedAndPaginatedCustomers.totalPages}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div>
        <h2 className="text-lg font-heading font-bold text-white mb-4">Détails du Client</h2>
        {selectedCustomer ? (
          <Card className="p-6 bg-slate-800 border-slate-700">
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-slate-700 text-white text-2xl">
                  {selectedCustomer.first_name[0]}{selectedCustomer.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-bold text-white">{selectedCustomer.first_name} {selectedCustomer.last_name}</h3>
                <p className="text-slate-400">{selectedCustomer.phone_number}</p>
              </div>
            </div>
            <div className="mb-6 space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                <span className="text-slate-400">Date d'inscription</span>
                <span className="text-white font-medium">{new Date(selectedCustomer.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>

            {/* Active Status Indicator */}
            <div className={`mt-4 flex items-center justify-between p-3 rounded-lg ${
              selectedCustomer.is_active === false ? 'bg-red-900/20' : 'bg-green-900/20'
            }`}>
              <div className="flex items-center gap-2">
                {selectedCustomer.is_active === false ? (
                  <>
                    <Ban className="h-5 w-5 text-red-400" />
                    <span className="text-red-400">Compte désactivé</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-green-400">Compte actif</span>
                  </>
                )}
              </div>
              <Button
                onClick={() => handleToggleCustomerActive(selectedCustomer.id)}
                size="sm"
                className={selectedCustomer.is_active === false
                  ? 'bg-green-600 hover:bg-green-700 gap-2'
                  : 'bg-orange-600 hover:bg-orange-700 gap-2'
                }
              >
                <Power className="h-4 w-4" />
                {selectedCustomer.is_active === false ? 'Activer' : 'Désactiver'}
              </Button>
            </div>

            <Button
              onClick={() => confirmDelete('customer', selectedCustomer.id, `${selectedCustomer.first_name} ${selectedCustomer.last_name}`)}
              variant="outline"
              className="w-full mt-4 border-red-600 text-red-400 hover:bg-red-600 hover:text-white gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer ce client
            </Button>
          </Card>
        ) : (
          <Card className="p-8 bg-slate-800 border-slate-700 text-center">
            <Eye className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Sélectionnez un client pour voir ses détails</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminCustomersTab;
