/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_MOCK?: string;
  readonly VITE_MOCK_EXCLUDE?: string;
  readonly VITE_BANK_ID?: string;
  readonly VITE_BANK_ACCOUNT_NO?: string;
  readonly VITE_BANK_ACCOUNT_NAME?: string;
}
