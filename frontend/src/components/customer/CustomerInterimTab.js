import CompanyInterimTab from '@/components/company/CompanyInterimTab';

// Customer Interim tab: same component, customer-side endpoints and customer token.
const CUSTOMER_ROUTES = {
  createMission:    '/interim/customer/missions',
  listMissions:     '/interim/customer/missions/mine',
  updateMission:    (id) => `/interim/customer/missions/${id}`,
  deleteMission:    (id) => `/interim/customer/missions/${id}`,
  listApplications: (id) => `/interim/customer/missions/${id}/applications`,
  acceptApp:        (aid) => `/interim/customer/applications/${aid}/accept`,
  rejectApp:        (aid) => `/interim/customer/applications/${aid}/reject`,
  completeMission:  (id) => `/interim/customer/missions/${id}/complete`,
  rateProvider:     (id) => `/interim/customer/missions/${id}/rate-provider`,
  listTimesheets:   '/interim/customer/timesheets',
  validateTs:       (id) => `/interim/customer/timesheets/${id}/validate`,
  rejectTs:         (id) => `/interim/customer/timesheets/${id}/reject`,
};

const CustomerInterimTab = () => (
  <CompanyInterimTab
    routes={CUSTOMER_ROUTES}
    tokenKey="customerToken"
    mode="customer"
    ownerHeaderTitle="Mes Missions Intérim"
    ownerHeaderSubtitle="Publiez vos missions ponctuelles (rénovation, garde, sécurité…) — max 2 actives en même temps."
  />
);

export default CustomerInterimTab;
