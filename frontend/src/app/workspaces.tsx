import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { adminApi, useAdminQuery } from '@/features/admin/api';

/** One back-office shell per role; only the menu differs. */
export function OrganizerShell() {
  return (
    <DashboardLayout
      titleKey="nav.organizerArea"
      home="/organizer"
      nav={[
        { to: '/organizer', key: 'nav.dashboard', icon: 'ri-dashboard-3-line', end: true },
        { to: '/organizer/events', key: 'nav.myEvents', icon: 'ri-calendar-event-line', end: true },
        { to: '/organizer/events/new', key: 'nav.newEvent', icon: 'ri-add-circle-line' },
      ]}
    />
  );
}

export function StaffShell() {
  return <DashboardLayout titleKey="nav.staffArea" home="/staff" nav={[{ to: '/staff', key: 'nav.checkIn', icon: 'ri-qr-scan-2-line', end: true }]} />;
}

export function AdminShell() {
  const { data } = useAdminQuery('dashboard', adminApi.dashboard);
  return (
    <DashboardLayout
      titleKey="nav.adminArea"
      home="/admin"
      nav={[
        { to: '/admin', key: 'nav.dashboard', icon: 'ri-dashboard-3-line', end: true },
        { to: '/admin/events', key: 'nav.reviewEvents', icon: 'ri-file-search-line', badge: data?.pendingEvents },
        { to: '/admin/orders', key: 'nav.orders', icon: 'ri-file-list-3-line', badge: data?.refundRequests },
        { to: '/admin/payments', key: 'nav.payments', icon: 'ri-bank-line', badge: data?.unmatchedPayments },
        { to: '/admin/users', key: 'nav.users', icon: 'ri-group-line' },
        { to: '/staff', key: 'nav.checkIn', icon: 'ri-qr-scan-2-line' },
      ]}
    />
  );
}
