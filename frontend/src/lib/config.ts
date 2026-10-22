const env = import.meta.env;

export const config = {
  useMock: env.VITE_USE_MOCK === 'true',
  apiBase: '/api/v1',
  bank: {
    id: env.VITE_BANK_ID ?? 'MB',
    accountNo: env.VITE_BANK_ACCOUNT_NO ?? '0000123456789',
    accountName: env.VITE_BANK_ACCOUNT_NAME ?? 'CONG TY TICKETBOX DEMO',
  },
} as const;
