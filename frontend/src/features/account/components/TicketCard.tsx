import { TicketStatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { coverOf } from '@/lib/cover';
import { formatDateTime } from '@/lib/format';
import type { Ticket } from '@/lib/types';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

/** E-ticket stub: info | perforation | scannable QR (encodes the signed qrToken). Click QR to enlarge. */
export function TicketCard({ ticket }: { ticket: Ticket }) {
  const { t, locale } = useI18n();
  const [zoom, setZoom] = useState(false);
  const usable = ticket.status === 'VALID';
  const cover = coverOf(ticket.eventId);
  return (
    <>
      <article className={cn('card flex flex-col overflow-hidden animate-slide-up sm:flex-row', !usable && 'opacity-75')}>
        <div className="flex-1">
          <div className={cn('h-2 bg-gradient-to-r', cover.gradient)} />
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold text-slate-900 dark:text-white">{ticket.eventName}</h3>
              <TicketStatusBadge status={ticket.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div className="col-span-2"><dt className="text-xs text-slate-400">{t('event.time')}</dt><dd className="font-medium">{formatDateTime(ticket.eventStartsAt, locale)}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-slate-400">{t('event.venue')}</dt><dd className="font-medium">{ticket.venueName}</dd></div>
              <div><dt className="text-xs text-slate-400">{t('ticket.type')}</dt><dd className="font-semibold">{ticket.ticketTypeName}</dd></div>
              <div><dt className="text-xs text-slate-400">{t('ticket.seat')}</dt><dd className="text-2xl leading-none font-extrabold text-brand-700 dark:text-brand-300">{ticket.seatCode ?? t('ticket.freeSeating')}</dd></div>
            </dl>
            {ticket.checkedInAt && <p className="mt-3 text-xs text-sky-600 dark:text-sky-400"><i className="ri-login-circle-line mr-1" />{t('ticket.checkedInAt', { time: formatDateTime(ticket.checkedInAt, locale) })}</p>}
          </div>
        </div>
        <div className="relative border-t-2 border-dashed border-slate-200 sm:border-t-0 sm:border-l-2 dark:border-slate-700">
          <span className="absolute -top-3 -left-3 size-6 rounded-full bg-slate-50 dark:bg-slate-950" />
          <span className="absolute -top-3 -right-3 size-6 rounded-full bg-slate-50 sm:top-auto sm:-bottom-3 sm:-left-3 dark:bg-slate-950" />
        </div>
        <button type="button" onClick={() => usable && setZoom(true)} className={cn('flex flex-col items-center justify-center gap-2 p-5', usable ? 'cursor-zoom-in' : 'cursor-default')}>
          <div className={cn('rounded-xl bg-white p-2', !usable && 'blur-[3px] grayscale')}>
            <QRCodeSVG value={ticket.qrToken} size={112} level="M" />
          </div>
          <p className="font-mono text-[11px] text-slate-500">{ticket.code}</p>
          {usable && <p className="text-[11px] text-brand-600 dark:text-brand-400"><i className="ri-zoom-in-line mr-0.5" />{t('ticket.tapToZoom')}</p>}
        </button>
      </article>

      <Modal open={zoom} onClose={() => setZoom(false)} title={ticket.eventName} size="sm">
        <div className="flex flex-col items-center text-center">
          <div className="rounded-2xl bg-white p-4 shadow-inner ring-1 ring-slate-200">
            <QRCodeSVG value={ticket.qrToken} size={240} level="M" />
          </div>
          <p className="mt-4 text-3xl font-extrabold text-brand-700 dark:text-brand-300">{ticket.seatCode ?? ticket.ticketTypeName}</p>
          <p className="font-mono text-sm text-slate-500">{ticket.code}</p>
          <p className="mt-1 text-sm">{ticket.holderName}</p>
          <p className="mt-4 text-xs text-slate-400">{t('ticket.brightness')}</p>
        </div>
      </Modal>
    </>
  );
}
