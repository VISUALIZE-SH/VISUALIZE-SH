/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NEWSLETTER_SIGNUP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
