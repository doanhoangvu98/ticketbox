import { setupWorker } from 'msw/browser';
import { adminHandlers } from './handlers/admin';
import { authHandlers } from './handlers/auth';
import { devHandlers } from './handlers/dev';
import { eventHandlers } from './handlers/events';
import { orderHandlers } from './handlers/orders';
import { organizerHandlers } from './handlers/organizer';
import { paymentHandlers } from './handlers/payments';
import { staffHandlers } from './handlers/staff';

/**
 * Handler groups. VITE_MOCK_EXCLUDE=auth,events turns those groups OFF, so their requests
 * fall through to the real Spring Boot API (via the Vite proxy) while the rest stays mocked.
 * This is how the frontend switches to the backend week by week (see docs/ROADMAP.md).
 *
 * Caveat: a mocked group and a real group do not share data (e.g. mock orders reference mock events),
 * so exclude groups in the order given by the roadmap.
 */
const GROUPS = {
  auth: authHandlers,
  events: eventHandlers,
  orders: orderHandlers,
  payments: paymentHandlers,
  staff: staffHandlers,
  organizer: organizerHandlers,
  admin: adminHandlers,
  dev: devHandlers,
};

const excluded = new Set((import.meta.env.VITE_MOCK_EXCLUDE ?? '').split(',').map((s: string) => s.trim()).filter(Boolean));

export const activeGroups = Object.keys(GROUPS).filter((g) => !excluded.has(g));

export const worker = setupWorker(...Object.entries(GROUPS).flatMap(([name, handlers]) => (excluded.has(name) ? [] : handlers)));
