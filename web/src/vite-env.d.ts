/// <reference types="vite/client" />

/** Build facts web/vite.config.ts defines. */
interface ImportMetaEnv {
  readonly BD_VERSION: string;
  readonly BD_BUILD: string;
  readonly BD_SUPPORT_URL: string;
  /** The plugins' server (`BLOKDUST_PLUGIN_SITE_URL`), or empty. */
  readonly BD_PLUGIN_SITE: string;
}
