/**
 * A verbatim TypeScript translation of the interfaces defined in the 
 * [WICG Cookie Store API](https://wicg.github.io/cookie-store/#CookieStore) working draft.
 */
export interface CookieStore extends EventTarget {
  get(name?: string): Promise<CookieListItem | null>;
  get(options?: CookieStoreGetOptions): Promise<CookieListItem | null>;

  getAll(name?: string): Promise<CookieList>;
  getAll(options?: CookieStoreGetOptions): Promise<CookieList>;

  set(name: string, value: string): Promise<void>;
  set(options: CookieInit): Promise<void>;

  delete(name: string): Promise<void>;
  delete(options: CookieStoreDeleteOptions): Promise<void>;
}

export interface CookieStoreGetOptions {
  name?: string;
  url?: string;
}

export type CookieSameSite = 'strict' | 'lax' | 'none';

export interface CookieInit {
  name: string;
  value: string;
  expires?: number | Date | null;
  domain?: string | null;
  path?: string;
  sameSite?: CookieSameSite;
  httpOnly?: boolean,
}

export interface CookieStoreDeleteOptions {
  name: string;
  domain?: string | null;
  path?: string;
}

export interface CookieListItem {
  name: string;
  value: string;
  domain?: string | null;
  path?: string;
  expires?: Date | null;
  secure?: boolean;
  sameSite?: CookieSameSite;
}

export type CookieList = CookieListItem[];
