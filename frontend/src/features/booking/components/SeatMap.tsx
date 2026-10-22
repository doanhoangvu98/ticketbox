import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import type { Seat, TicketType } from '@/lib/types';
import { useMemo } from 'react';

interface SeatMapProps {
  seats: Seat[];
  ticketTypes: TicketType[];
  selected: ReadonlySet<string>;
  onToggle: (seat: Seat) => void;
  disabled?: boolean;
}

/**
 * Interactive seat map. Available seats are tinted with their tier colour; the aisle splits each row.
 * On small screens the map scrolls horizontally instead of shrinking seats below a tappable size.
 */
export function SeatMap({ seats, ticketTypes, selected, onToggle, disabled }: SeatMapProps) {
  const { t, locale } = useI18n();
  const tierOf = useMemo(() => new Map(ticketTypes.map((tt) => [tt.id, tt])), [ticketTypes]);
  const rows = useMemo(() => {
    const map = new Map<string, Seat[]>();
    seats.forEach((s) => map.set(s.row, [...(map.get(s.row) ?? []), s]));
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([row, list]) => ({ row, seats: list.sort((a, b) => a.number - b.number) }));
  }, [seats]);

  return (
    <div>
      <div className="mx-auto mb-8 max-w-lg">
        <div className="h-2 rounded-full bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-70" />
        <div className="mx-auto h-8 w-4/5 rounded-b-[50%] bg-gradient-to-b from-brand-500/15 to-transparent" />
        <p className="-mt-6 text-center text-xs font-bold tracking-[0.3em] text-slate-400">{t('booking.stage')}</p>
      </div>
      <div className="no-scrollbar overflow-x-auto pb-2">
        <div className="mx-auto flex w-max flex-col gap-1.5 px-2 sm:gap-2">
          {rows.map(({ row, seats: rowSeats }) => (
            <div key={row} className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-5 text-center text-xs font-bold text-slate-400">{row}</span>
              {rowSeats.map((seat, i) => {
                const tier = tierOf.get(seat.ticketTypeId);
                const isSelected = selected.has(seat.code);
                const free = seat.status === 'AVAILABLE';
                const aisle = i === Math.floor(rowSeats.length / 2) - 1;
                return (
                  <button
                    key={seat.code}
                    type="button"
                    disabled={disabled || (!free && !isSelected)}
                    aria-pressed={isSelected}
                    aria-label={`${seat.code} · ${tier?.name} · ${formatCurrency(tier?.price ?? 0, locale)}`}
                    title={`${seat.code} · ${tier?.name} · ${formatCurrency(tier?.price ?? 0, locale)}`}
                    onClick={() => onToggle(seat)}
                    style={free && !isSelected ? { backgroundColor: `${tier?.color}26`, boxShadow: `inset 0 0 0 1.5px ${tier?.color}` } : undefined}
                    className={cn(
                      'flex size-7 cursor-pointer items-center justify-center rounded-t-lg rounded-b-md text-[10px] font-semibold transition duration-150 sm:size-8',
                      aisle && 'mr-3 sm:mr-6',
                      isSelected && 'scale-110 bg-brand-600 text-white shadow-md shadow-brand-600/40 ring-2 ring-brand-300 dark:ring-brand-400/50',
                      free && !isSelected && 'text-slate-700 hover:scale-110 dark:text-slate-200',
                      seat.status === 'SOLD' && 'cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600',
                      seat.status === 'HELD' && 'cursor-not-allowed bg-slate-100 text-slate-400 [background-image:repeating-linear-gradient(45deg,transparent_0_3px,rgb(148_163_184/.35)_3px_5px)] dark:bg-slate-800/60',
                      seat.status === 'BLOCKED' && 'cursor-not-allowed bg-transparent text-slate-300 dark:text-slate-700',
                    )}
                  >
                    {seat.status === 'SOLD' ? <i className="ri-close-line text-xs" /> : seat.status === 'BLOCKED' ? <i className="ri-forbid-line text-xs" /> : seat.number}
                  </button>
                );
              })}
              <span className="w-5 text-center text-xs font-bold text-slate-400">{row}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-slate-400 sm:hidden"><i className="ri-arrow-left-right-line mr-1" />{t('booking.scrollHint')}</p>
    </div>
  );
}

export function SeatLegend({ ticketTypes }: { ticketTypes: TicketType[] }) {
  const { t, locale } = useI18n();
  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs">
        {ticketTypes.map((tt) => (
          <li key={tt.id} className="flex items-center gap-2">
            <span className="size-4 rounded-t-md rounded-b-sm" style={{ backgroundColor: `${tt.color}26`, boxShadow: `inset 0 0 0 1.5px ${tt.color}` }} />
            <span className="font-semibold">{tt.name}</span>
            <span className="text-slate-500">{formatCurrency(tt.price, locale)}</span>
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-slate-500">
        <li className="flex items-center gap-2"><span className="size-4 rounded-t-md rounded-b-sm bg-brand-600" />{t('booking.legendSelected')}</li>
        <li className="flex items-center gap-2"><span className="size-4 rounded-t-md rounded-b-sm bg-slate-100 [background-image:repeating-linear-gradient(45deg,transparent_0_3px,rgb(148_163_184/.35)_3px_5px)] dark:bg-slate-800" />{t('booking.legendHeld')}</li>
        <li className="flex items-center gap-2"><span className="size-4 rounded-t-md rounded-b-sm bg-slate-200 dark:bg-slate-800" />{t('booking.legendSold')}</li>
        <li className="flex items-center gap-2"><i className="ri-forbid-line text-slate-400" />{t('booking.legendBlocked')}</li>
      </ul>
    </div>
  );
}
