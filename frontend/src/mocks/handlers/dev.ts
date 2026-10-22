import { delay, http, HttpResponse } from 'msw';
import { allTickets, resetDb } from '../db';
import { API } from '../utils';

/** Mock-only helpers used by the DEV panel. These endpoints do NOT exist on the real backend. */
export const devHandlers = [
  http.post(`${API}/__dev/reset`, async () => {
    await delay(200);
    resetDb();
    return HttpResponse.json({ ok: true });
  }),

  http.get(`${API}/__dev/tickets`, async ({ request }) => {
    const eventId = Number(new URL(request.url).searchParams.get('eventId'));
    return HttpResponse.json(allTickets().filter((t) => t.eventId === eventId).slice(0, 6));
  }),
];
