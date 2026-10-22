import { AppLayout } from '@/components/layout/AppLayout';
import { AdminDashboardPage } from '@/features/admin/pages/AdminDashboardPage';
import { AdminEventsPage } from '@/features/admin/pages/AdminEventsPage';
import { AdminOrdersPage } from '@/features/admin/pages/AdminOrdersPage';
import { AdminPaymentsPage } from '@/features/admin/pages/AdminPaymentsPage';
import { AdminUsersPage } from '@/features/admin/pages/AdminUsersPage';
import { MyOrdersPage } from '@/features/account/pages/MyOrdersPage';
import { MyTicketsPage } from '@/features/account/pages/MyTicketsPage';
import { OrderDetailPage } from '@/features/account/pages/OrderDetailPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { RequireRole } from '@/features/auth/RequireRole';
import { CheckoutPage } from '@/features/booking/pages/CheckoutPage';
import { SelectTicketsPage } from '@/features/booking/pages/SelectTicketsPage';
import { EventDetailPage } from '@/features/events/pages/EventDetailPage';
import { HomePage } from '@/features/events/pages/HomePage';
import { OrganizerDashboardPage } from '@/features/organizer/pages/OrganizerDashboardPage';
import { OrganizerEventFormPage } from '@/features/organizer/pages/OrganizerEventFormPage';
import { OrganizerEventPage } from '@/features/organizer/pages/OrganizerEventPage';
import { OrganizerEventsPage } from '@/features/organizer/pages/OrganizerEventsPage';
import { CheckInPage } from '@/features/staff/pages/CheckInPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { createBrowserRouter, Outlet } from 'react-router';
import { RootLayout } from './RootLayout';
import { AdminShell, OrganizerShell, StaffShell } from './workspaces';

/**
 * Route map by role:
 *   public    /, /events/:id, /events/:id/book, /login, /register
 *   CUSTOMER  /checkout/:code, /me/*
 *   ORGANIZER /organizer/*
 *   STAFF     /staff            (ADMIN can also check in)
 *   ADMIN     /admin/*
 */
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/events/:id', element: <EventDetailPage /> },
          { path: '/events/:id/book', element: <SelectTicketsPage /> },
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
          {
            element: <RequireRole roles={['CUSTOMER']}><Outlet /></RequireRole>,
            children: [
              { path: '/checkout/:code', element: <CheckoutPage /> },
              { path: '/me/tickets', element: <MyTicketsPage /> },
              { path: '/me/orders', element: <MyOrdersPage /> },
              { path: '/me/orders/:code', element: <OrderDetailPage /> },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        path: '/organizer',
        element: <RequireRole roles={['ORGANIZER']}><OrganizerShell /></RequireRole>,
        children: [
          { index: true, element: <OrganizerDashboardPage /> },
          { path: 'events', element: <OrganizerEventsPage /> },
          { path: 'events/new', element: <OrganizerEventFormPage /> },
          { path: 'events/:id', element: <OrganizerEventPage /> },
          { path: 'events/:id/edit', element: <OrganizerEventFormPage /> },
        ],
      },
      {
        path: '/staff',
        element: <RequireRole roles={['STAFF', 'ADMIN']}><StaffShell /></RequireRole>,
        children: [{ index: true, element: <CheckInPage /> }],
      },
      {
        path: '/admin',
        element: <RequireRole roles={['ADMIN']}><AdminShell /></RequireRole>,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'events', element: <AdminEventsPage /> },
          { path: 'orders', element: <AdminOrdersPage /> },
          { path: 'payments', element: <AdminPaymentsPage /> },
          { path: 'users', element: <AdminUsersPage /> },
        ],
      },
    ],
  },
]);
