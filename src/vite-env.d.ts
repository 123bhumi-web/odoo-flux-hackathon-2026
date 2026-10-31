/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GRAVITY_AI_API_KEY: string;
  readonly VITE_GRAVITY_AI_API_ENDPOINT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
