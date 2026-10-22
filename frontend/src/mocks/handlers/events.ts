import { delay, http, HttpResponse } from 'msw';
import { db, findEvent, sweepExpired, toDetail, toSummary } from '../db';
import { API, currentUser, paginate, problem } from '../utils';

export const eventHandlers = [
  /** Public catalogue: only PUBLISHED events that have not ended. */
  http.get(`${API}/events`, async ({ request }) => {
    await delay();
    sweepExpired();
    const url = new URL(request.url);
    const keyword = url.searchParams.get('keyword')?.trim().toLowerCase();
    const category = url.searchParams.get('category');
    const city = url.searchParams.get('city');
    const now = Date.now();
    const list = db.events
      .filter((e) => e.status === 'PUBLISHED' && new Date(e.endsAt).getTime() > now)
      .map(toSummary)
      .filter((e) => !keyword || e.name.toLowerCase().includes(keyword) || e.venueName.toLowerCase().includes(keyword))
      .filter((e) => !category || e.category === category)
      .filter((e) => !city || e.city === city)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return HttpResponse.json(paginate(list, url));
  }),

  /** Detail. Non-public events are visible to their organizer and to admins (preview / review). */
  http.get(`${API}/events/:id`, async ({ request, params }) => {
    await delay();
    sweepExpired();
    const event = findEvent(Number(params.id));
    const user = currentUser(request);
    const isPublic = event && (event.status === 'PUBLISHED' || event.status === 'COMPLETED' || event.status === 'CANCELLED');
    const canPreview = event && user && (user.role === 'ADMIN' || user.id === event.organizerId);
    if (!event || (!isPublic && !canPreview)) return problem(404, 'EVENT_NOT_FOUND', `Event not found: ${params.id}`);
    return HttpResponse.json(toDetail(event));
  }),

  http.get(`${API}/events/:id/seats`, async ({ params }) => {
    await delay(250);
    sweepExpired();
    const seats = db.seats[Number(params.id)];
    if (!seats) return problem(404, 'EVENT_NOT_FOUND', `No seat map for event ${params.id}`);
    // Never expose which order holds a seat.
    return HttpResponse.json(seats.map(({ orderCode: _o, ...s }) => s));
  }),

  http.get(`${API}/venues`, async () => {
    await delay(150);
    return HttpResponse.json(db.venues);
  }),
];
