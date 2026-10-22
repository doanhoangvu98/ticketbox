import { Button, IconButton } from '@/components/ui/Button';
import { Field, inputCls, PageHeader } from '@/components/ui/Data';
import { Alert, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { useEvent, useVenues } from '@/features/events/api';
import { useI18n } from '@/i18n/I18nProvider';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { CATEGORIES, TIER_COLORS } from '@/lib/constants';
import { formatCurrency } from '@/lib/format';
import type { EventCategory, EventDetail, SeatingType, UpsertEventRequest, Venue } from '@/lib/types';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'react-toastify';
import { organizerApi, useOrganizerMutation } from '../api';

type Tier = UpsertEventRequest['ticketTypes'][number];
interface FormState extends Omit<UpsertEventRequest, 'venueId' | 'ticketTypes'> {
  venueId: string;
  ticketTypes: Tier[];
}

/** ISO <-> value of <input type="datetime-local"> (local time, no zone). */
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const toIso = (local: string) => (local ? new Date(local).toISOString() : '');
const rowLetters = (n: number) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));

const EMPTY: FormState = {
  name: '', category: 'MUSIC', description: '', venueId: '', startsAt: '', endsAt: '', saleStartsAt: '', saleEndsAt: '',
  seatingType: 'RESERVED',
  ticketTypes: [{ name: 'VIP', price: 1_000_000, color: TIER_COLORS[1]!, quota: 0, maxPerOrder: 6, rowFrom: 'A', rowTo: 'B' }],
};

function fromEvent(e: EventDetail): FormState {
  return {
    name: e.name, category: e.category, description: e.description, venueId: String(e.venue.id), seatingType: e.seatingType,
    startsAt: toLocalInput(e.startsAt), endsAt: toLocalInput(e.endsAt), saleStartsAt: toLocalInput(e.saleStartsAt), saleEndsAt: toLocalInput(e.saleEndsAt),
    ticketTypes: e.ticketTypes.map(({ name, price, color, quota, maxPerOrder, rowFrom, rowTo }) => ({ name, price, color, quota, maxPerOrder, rowFrom, rowTo })),
  };
}

/** Create (/organizer/events/new) and edit (/organizer/events/:id/edit, DRAFT or REJECTED only). */
export function OrganizerEventFormPage() {
  const params = useParams();
  const editId = params.id ? Number(params.id) : undefined;
  const existing = useEvent(editId ?? 0);
  if (editId && existing.error) return <ErrorState error={existing.error} />;
  if (editId && !existing.data) return <Skeleton className="h-96" />;
  return <EventForm key={editId ?? 'new'} editId={editId} initial={existing.data ? fromEvent(existing.data) : EMPTY} />;
}

function EventForm({ editId, initial }: { editId?: number; initial: FormState }) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const venues = useVenues();
  const [form, setForm] = useState<FormState>(initial);
  const save = useOrganizerMutation((body: UpsertEventRequest) => (editId ? organizerApi.update(editId, body) : organizerApi.create(body)));
  const errors = save.error instanceof ApiError ? save.error.fieldErrors : {};

  const venue: Venue | undefined = venues.data?.find((v) => String(v.id) === form.venueId);
  const canReserve = !venue || venue.totalRows > 0;

  // A venue without a seat map can only host general admission.
  useEffect(() => {
    if (venue && venue.totalRows === 0 && form.seatingType === 'RESERVED') setForm((f) => ({ ...f, seatingType: 'GENERAL_ADMISSION' }));
  }, [venue, form.seatingType]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setTier = (i: number, patch: Partial<Tier>) => setForm((f) => ({ ...f, ticketTypes: f.ticketTypes.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const addTier = () =>
    setForm((f) => ({ ...f, ticketTypes: [...f.ticketTypes, { name: '', price: 300_000, color: TIER_COLORS[f.ticketTypes.length % TIER_COLORS.length]!, quota: 100, maxPerOrder: 6, rowFrom: 'A', rowTo: 'A' }] }));
  const removeTier = (i: number) => setForm((f) => ({ ...f, ticketTypes: f.ticketTypes.filter((_, j) => j !== i) }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body: UpsertEventRequest = {
      ...form, venueId: Number(form.venueId),
      startsAt: toIso(form.startsAt), endsAt: toIso(form.endsAt), saleStartsAt: toIso(form.saleStartsAt), saleEndsAt: toIso(form.saleEndsAt),
      ticketTypes: form.ticketTypes.map((x) => ({ ...x, price: Number(x.price), quota: Number(x.quota), maxPerOrder: Number(x.maxPerOrder) })),
    };
    save.mutate(body, {
      onSuccess: (ev) => {
        toast.success(editId ? t('org.saved') : t('org.created'));
        navigate(`/organizer/events/${ev.id}`);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const rows = venue ? rowLetters(venue.totalRows) : [];
  const tierOfRow = (r: string) => form.ticketTypes.find((x) => x.rowFrom && x.rowTo && x.rowFrom <= r && r <= x.rowTo);

  return (
    <form onSubmit={submit} noValidate>
      <Link to={editId ? `/organizer/events/${editId}` : '/organizer/events'} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"><i className="ri-arrow-left-line" />{t('common.back')}</Link>
      <PageHeader
        title={editId ? t('org.editEvent') : t('org.newEvent')}
        subtitle={t('org.formSubtitle')}
        actions={<Button type="submit" icon="ri-save-3-line" loading={save.isPending}>{t('common.save')}</Button>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="card space-y-5 p-5 sm:p-6">
            <h2 className="font-bold">{t('org.sectionInfo')}</h2>
            <Field id="name" label={t('org.name')} error={errors.name}>
              <input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={200} className={inputCls(errors.name)} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="category" label={t('org.category')}>
                <select id="category" value={form.category} onChange={(e) => set('category', e.target.value as EventCategory)} className="input">
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{t(`category.${c.value}`)}</option>)}
                </select>
              </Field>
              <Field id="venueId" label={t('org.venue')} error={errors.venueId}>
                <select id="venueId" value={form.venueId} onChange={(e) => set('venueId', e.target.value)} className={inputCls(errors.venueId)}>
                  <option value="">{t('org.selectVenue')}</option>
                  {venues.data?.map((v) => <option key={v.id} value={v.id}>{v.name} · {v.city} ({v.capacity})</option>)}
                </select>
              </Field>
            </div>
            <Field id="description" label={t('org.description')}>
              <textarea id="description" rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} className="input" />
            </Field>
          </section>

          <section className="card space-y-5 p-5 sm:p-6">
            <h2 className="font-bold">{t('org.sectionTime')}</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="startsAt" label={t('org.startsAt')} error={errors.startsAt}><input id="startsAt" type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} className={inputCls(errors.startsAt)} /></Field>
              <Field id="endsAt" label={t('org.endsAt')} error={errors.endsAt}><input id="endsAt" type="datetime-local" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} className={inputCls(errors.endsAt)} /></Field>
              <Field id="saleStartsAt" label={t('org.saleStartsAt')} error={errors.saleStartsAt}><input id="saleStartsAt" type="datetime-local" value={form.saleStartsAt} onChange={(e) => set('saleStartsAt', e.target.value)} className={inputCls(errors.saleStartsAt)} /></Field>
              <Field id="saleEndsAt" label={t('org.saleEndsAt')} error={errors.saleEndsAt}><input id="saleEndsAt" type="datetime-local" value={form.saleEndsAt} onChange={(e) => set('saleEndsAt', e.target.value)} className={inputCls(errors.saleEndsAt)} /></Field>
            </div>
          </section>

          <section className="card space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold">{t('org.sectionTickets')}</h2>
              <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                {(['RESERVED', 'GENERAL_ADMISSION'] as SeatingType[]).map((s) => (
                  <button key={s} type="button" disabled={s === 'RESERVED' && !canReserve} onClick={() => set('seatingType', s)}
                    className={cn('cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40', form.seatingType === s ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-950 dark:text-brand-300' : 'text-slate-500')}>
                    {t(`seating.${s}`)}
                  </button>
                ))}
              </div>
            </div>
            {errors.ticketTypes && <Alert tone="danger">{errors.ticketTypes}</Alert>}
            <ul className="space-y-4">
              {form.ticketTypes.map((tier, i) => (
                <li key={i} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="grid gap-3 sm:grid-cols-[1fr_160px_120px_auto]">
                    <Field id={`tn${i}`} label={t('org.tierName')} error={errors[`ticketTypes[${i}].name`]}><input id={`tn${i}`} value={tier.name} onChange={(e) => setTier(i, { name: e.target.value })} className={inputCls(errors[`ticketTypes[${i}].name`])} /></Field>
                    <Field id={`tp${i}`} label={t('org.tierPrice')} error={errors[`ticketTypes[${i}].price`]}><input id={`tp${i}`} type="number" min={0} step={10000} value={tier.price} onChange={(e) => setTier(i, { price: Number(e.target.value) })} className="input" /></Field>
                    <Field id={`tm${i}`} label={t('org.tierMax')}><input id={`tm${i}`} type="number" min={1} max={8} value={tier.maxPerOrder} onChange={(e) => setTier(i, { maxPerOrder: Number(e.target.value) })} className="input" /></Field>
                    <div className="flex items-end"><IconButton icon="ri-delete-bin-line" label={t('common.remove')} disabled={form.ticketTypes.length === 1} onClick={() => removeTier(i)} className="text-rose-500" /></div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-end gap-4">
                    {form.seatingType === 'RESERVED' ? (
                      <>
                        <Field id={`rf${i}`} label={t('org.rowFrom')}><select id={`rf${i}`} value={tier.rowFrom} onChange={(e) => setTier(i, { rowFrom: e.target.value })} className="input w-24">{rows.map((r) => <option key={r}>{r}</option>)}</select></Field>
                        <Field id={`rt${i}`} label={t('org.rowTo')} error={errors[`ticketTypes[${i}].rowTo`] ?? errors[`ticketTypes[${i}].rowFrom`]}><select id={`rt${i}`} value={tier.rowTo} onChange={(e) => setTier(i, { rowTo: e.target.value })} className="input w-24">{rows.map((r) => <option key={r}>{r}</option>)}</select></Field>
                      </>
                    ) : (
                      <Field id={`tq${i}`} label={t('org.tierQuota')}><input id={`tq${i}`} type="number" min={1} value={tier.quota} onChange={(e) => setTier(i, { quota: Number(e.target.value) })} className="input w-32" /></Field>
                    )}
                    <div>
                      <span className="label">{t('org.tierColor')}</span>
                      <div className="flex gap-1.5 py-2">
                        {TIER_COLORS.map((c) => (
                          <button key={c} type="button" aria-label={c} onClick={() => setTier(i, { color: c })} className={cn('size-7 cursor-pointer rounded-full ring-offset-2 transition dark:ring-offset-slate-900', tier.color === c && 'ring-2 ring-slate-900 dark:ring-white')} style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <Button variant="secondary" icon="ri-add-line" onClick={addTier}>{t('org.addTier')}</Button>
          </section>
        </div>

        <aside className="card h-fit p-5 lg:sticky lg:top-24">
          <h2 className="font-bold">{t('org.preview')}</h2>
          {!venue ? <p className="mt-3 text-sm text-slate-500">{t('org.selectVenue')}</p> : form.seatingType === 'RESERVED' ? (
            <div className="mt-4 flex flex-col items-center gap-1 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <div className="mb-2 h-1.5 w-2/3 rounded-full bg-brand-400/60" />
              {rows.map((r) => {
                const tier = tierOfRow(r);
                return (
                  <div key={r} className="flex items-center gap-0.5">
                    <span className="w-3 text-[9px] text-slate-400">{r}</span>
                    {Array.from({ length: Math.min(venue.seatsPerRow, 20) }, (_, n) => (
                      <span key={n} className="size-2 rounded-sm" style={{ backgroundColor: tier?.color ?? '#cbd5e1', opacity: tier ? 1 : 0.4 }} />
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">{t('org.gaCapacity', { capacity: venue.capacity })}</p>
          )}
          <ul className="mt-4 space-y-2 text-sm">
            {form.ticketTypes.map((x, i) => {
              const quota = form.seatingType === 'RESERVED' && venue && x.rowFrom && x.rowTo ? (x.rowTo.charCodeAt(0) - x.rowFrom.charCodeAt(0) + 1) * venue.seatsPerRow : x.quota;
              return (
                <li key={i} className="flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ backgroundColor: x.color }} />
                  <span className="flex-1 truncate">{x.name || '—'}</span>
                  <span className="text-slate-500">{quota}</span>
                  <span className="w-24 text-right font-semibold">{formatCurrency(Number(x.price) || 0, locale)}</span>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </form>
  );
}
