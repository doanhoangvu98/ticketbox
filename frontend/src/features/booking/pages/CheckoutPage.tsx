import { Button } from '@/components/ui/Button';
import { Field, inputCls } from '@/components/ui/Data';
import { Alert, EmptyState, ErrorState, Skeleton, Spinner } from '@/components/ui/Feedback';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatMmSs, useCountdown } from '@/hooks/useCountdown';
import { useI18n } from '@/i18n/I18nProvider';
import { api, ApiError, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { config } from '@/lib/config';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { Buyer, Order, PaymentInstruction } from '@/lib/types';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'react-toastify';
import { ordersApi, useOrder, useOrderMutation } from '../api';
import { OrderLines } from '../components/OrderLines';
import { Steps } from './SelectTicketsPage';

/** Step 2 + 3: buyer info, promo code, VietQR bank transfer, wait for the bank webhook. */
export function CheckoutPage() {
  const code = String(useParams().code);
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<PaymentInstruction>();
  const { data: order, error, refetch } = useOrder(code, !!payment);
  const secondsLeft = useCountdown(order?.status === 'PENDING' ? order.expiresAt : undefined);
  const cancel = useOrderMutation(() => ordersApi.cancel(code));

  // Paid (bank webhook arrived) -> go to the tickets.
  useEffect(() => {
    if (order?.status === 'PAID') {
      toast.success(t('checkout.paidToast'));
      navigate(`/me/orders/${order.code}`, { replace: true });
    }
  }, [order?.status, order?.code, navigate, t]);

  // The countdown hit zero: ask the server (it will report EXPIRED).
  useEffect(() => {
    if (order?.status === 'PENDING' && secondsLeft === 0) refetch();
  }, [secondsLeft, order?.status, refetch]);

  if (error) return <div className="mx-auto max-w-5xl px-4 py-10"><ErrorState error={error} onRetry={() => refetch()} /></div>;
  if (!order) return <div className="mx-auto max-w-5xl space-y-4 px-4 py-10"><Skeleton className="h-12" /><Skeleton className="h-96" /></div>;

  if (order.status === 'EXPIRED' || order.status === 'CANCELLED') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState
          icon={order.status === 'EXPIRED' ? 'ri-timer-flash-line' : 'ri-close-circle-line'}
          title={order.status === 'EXPIRED' ? t('checkout.expiredTitle') : t('checkout.cancelledTitle')}
          text={t('checkout.expiredText')}
          action={<Link to={`/events/${order.eventId}/book`}><Button icon="ri-armchair-line">{t('checkout.pickAgain')}</Button></Link>}
        />
      </div>
    );
  }
  if (order.status !== 'PENDING') return null; // PAID: effect above redirects

  const urgent = secondsLeft < 120;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Steps current={payment ? 3 : 2} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t('checkout.title')}</h1>
        <span className="font-mono text-sm text-slate-500">#{order.code}</span>
      </div>

      <div
        role="timer"
        className={cn('mt-4 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm', urgent ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300' : 'bg-brand-50 text-brand-800 dark:bg-brand-500/10 dark:text-brand-200')}
      >
        <i className={cn('ri-timer-line text-xl', urgent && 'animate-pulse')} />
        <span>{t('checkout.timeLeft')}</span>
        <span className="ml-auto font-mono text-2xl font-bold tabular-nums">{formatMmSs(secondsLeft)}</span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {payment ? <PaymentPanel payment={payment} order={order} onChangeInfo={() => setPayment(undefined)} /> : <BuyerForm order={order} onReady={setPayment} />}
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="font-bold text-slate-900 dark:text-white">{order.eventName}</h2>
            <p className="mt-1 text-sm text-slate-500">{formatDateTime(order.eventStartsAt, locale)}<br />{order.venueName}</p>
            <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800"><OrderLines order={order} /></div>
            {!payment && <PromoBox order={order} />}
          </div>
          <Button
            variant="ghost"
            className="w-full text-rose-600"
            icon="ri-close-circle-line"
            loading={cancel.isPending}
            onClick={() => window.confirm(t('checkout.cancelConfirm')) && cancel.mutate(undefined, { onSuccess: () => navigate(`/events/${order.eventId}`) })}
          >
            {t('checkout.cancelOrder')}
          </Button>
        </aside>
      </div>
    </div>
  );
}

function BuyerForm({ order, onReady }: { order: Order; onReady: (p: PaymentInstruction) => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [buyer, setBuyer] = useState<Buyer>(order.buyer ?? { fullName: user?.fullName ?? '', email: user?.email ?? '', phone: user?.phone ?? '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      onReady(await ordersApi.checkout(order.code, buyer));
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors);
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };
  const set = (k: keyof Buyer) => (e: { target: { value: string } }) => setBuyer({ ...buyer, [k]: e.target.value });

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <section className="card p-5 sm:p-6">
        <h2 className="mb-1 font-bold text-slate-900 dark:text-white">{t('checkout.buyerTitle')}</h2>
        <p className="mb-4 text-sm text-slate-500">{t('checkout.buyerHint')}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="fullName" label={t('auth.fullName')} error={errors.fullName} className="sm:col-span-2">
            <input id="fullName" autoComplete="name" value={buyer.fullName} onChange={set('fullName')} className={inputCls(errors.fullName)} />
          </Field>
          <Field id="email" label={t('auth.email')} error={errors.email}>
            <input id="email" type="email" autoComplete="email" value={buyer.email} onChange={set('email')} className={inputCls(errors.email)} />
          </Field>
          <Field id="phone" label={t('auth.phone')} error={errors.phone} hint="0901234567">
            <input id="phone" type="tel" autoComplete="tel" value={buyer.phone} onChange={set('phone')} className={inputCls(errors.phone)} />
          </Field>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="mb-4 font-bold text-slate-900 dark:text-white">{t('checkout.method')}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl border-2 border-brand-500 bg-brand-50 p-4 dark:bg-brand-500/10">
            <i className="ri-qr-code-line text-2xl text-brand-600" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{t('checkout.methodVietQr')}</p>
              <p className="text-xs text-slate-500">{t('checkout.methodVietQrHint')}</p>
            </div>
            <i className="ri-checkbox-circle-fill ml-auto text-xl text-brand-600" />
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 opacity-50 dark:border-slate-700">
            <i className="ri-bank-card-line text-2xl" />
            <div>
              <p className="font-semibold">{t('checkout.methodCard')}</p>
              <p className="text-xs text-slate-500">{t('common.comingSoon')}</p>
            </div>
          </div>
        </div>
        <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-4 accent-brand-600" />
          {t('checkout.agree')}
        </label>
      </section>

      <Button type="submit" size="lg" className="w-full" icon="ri-qr-scan-2-line" loading={loading} disabled={!agree}>
        {t('checkout.toPayment')}
      </Button>
    </form>
  );
}

function PromoBox({ order }: { order: Order }) {
  const { t } = useI18n();
  const [code, setCode] = useState(order.promoCode ?? '');
  const apply = useOrderMutation((c: string) => ordersApi.applyPromo(order.code, c));
  return (
    <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
      <label htmlFor="promo" className="label">{t('checkout.promo')}</label>
      <div className="flex gap-2">
        <input id="promo" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="NOAH10" className="input font-mono uppercase" />
        {order.promoCode ? (
          <Button variant="secondary" loading={apply.isPending} onClick={() => apply.mutate('', { onSuccess: () => setCode('') })}>{t('common.remove')}</Button>
        ) : (
          <Button variant="secondary" disabled={!code.trim()} loading={apply.isPending} onClick={() => apply.mutate(code, { onSuccess: () => toast.success(t('checkout.promoApplied')), onError: (e) => toast.error(e.message) })}>
            {t('checkout.apply')}
          </Button>
        )}
      </div>
    </div>
  );
}

function PaymentPanel({ payment, order, onChangeInfo }: { payment: PaymentInstruction; order: Order; onChangeInfo: () => void }) {
  const { t, locale } = useI18n();
  const [qrFailed, setQrFailed] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const copy = (value: string) => navigator.clipboard.writeText(value).then(() => toast.success(t('common.copied')));

  /** Mock only: pretend the bank called our webhook. */
  const simulateTransfer = async () => {
    setSimulating(true);
    try {
      await api.post(
        '/payments/webhook/bank',
        { transactionId: `FT${Date.now()}`, amount: payment.amount, content: `${payment.transferContent} chuyen tien`, transferredAt: new Date().toISOString() },
        { headers: { 'X-Api-Key': 'mock-bank-key' } },
      );
    } finally {
      setSimulating(false);
    }
  };

  const rows: [string, string, boolean][] = [
    [t('checkout.bank'), payment.bankId, false],
    [t('checkout.accountNo'), payment.accountNo, true],
    [t('checkout.accountName'), payment.accountName, false],
    [t('checkout.amount'), formatCurrency(payment.amount, locale), false],
    [t('checkout.content'), payment.transferContent, true],
  ];

  return (
    <section className="card overflow-hidden">
      <div className="bg-gradient-to-r from-brand-600 to-fuchsia-500 px-5 py-4 text-white sm:px-6">
        <h2 className="font-bold">{t('checkout.scanTitle')}</h2>
        <p className="text-sm text-white/85">{t('checkout.scanHint')}</p>
      </div>
      <div className="grid gap-6 p-5 sm:grid-cols-[260px_1fr] sm:p-6">
        <div className="mx-auto w-full max-w-[260px]">
          <div className="rounded-2xl bg-white p-3 shadow-inner ring-1 ring-slate-200">
            {qrFailed ? (
              <div className="flex aspect-square items-center justify-center p-4 text-center text-sm text-slate-500">{t('checkout.qrOffline')}</div>
            ) : (
              <img src={payment.qrImageUrl} alt="VietQR" className="aspect-square w-full object-contain" onError={() => setQrFailed(true)} />
            )}
          </div>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-500"><i className="ri-bank-line" />NAPAS 247 · VietQR</p>
        </div>
        <div>
          <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {rows.map(([label, value, copyable]) => (
              <div key={label} className="flex items-center gap-3 py-2.5">
                <dt className="w-28 shrink-0 text-slate-500">{label}</dt>
                <dd className={cn('min-w-0 flex-1 truncate font-semibold text-slate-900 dark:text-white', label === t('checkout.content') && 'font-mono text-brand-700 dark:text-brand-300')}>{value}</dd>
                {copyable && <button type="button" onClick={() => copy(value)} className="cursor-pointer text-slate-400 hover:text-brand-600" aria-label={t('common.copy')}><i className="ri-file-copy-line" /></button>}
              </div>
            ))}
          </dl>
          <Alert tone="warning" className="mt-4">{t('checkout.contentWarning', { code: payment.transferContent })}</Alert>
          <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            <Spinner />
            {t('checkout.waiting')}
          </div>
          <button type="button" onClick={onChangeInfo} className="mt-3 cursor-pointer text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">{t('checkout.editInfo')}</button>
        </div>
      </div>
      {config.useMock && (
        <div className="border-t border-dashed border-amber-300 bg-amber-50/70 px-5 py-4 sm:px-6 dark:border-amber-500/30 dark:bg-amber-500/5">
          <p className="mb-2 text-xs text-amber-800 dark:text-amber-300"><i className="ri-flask-line mr-1" />{t('checkout.devHint')}</p>
          <Button variant="success" size="sm" icon="ri-bank-line" loading={simulating} onClick={simulateTransfer}>{t('checkout.devSimulate', { code: order.code })}</Button>
        </div>
      )}
    </section>
  );
}
