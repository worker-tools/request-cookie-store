import type { 
  CookieStore, CookieListItem, CookieList, CookieInit, CookieStoreGetOptions, CookieStoreDeleteOptions,
} from 'https://ghuc.cc/qwtel/cookie-store-interface/index.d.ts';
export * from 'https://ghuc.cc/qwtel/cookie-store-interface/index.d.ts';

import { setCookie, attrsToSetCookie, parseCookieHeader } from './set-cookie.ts';

/**
 * # Request Cookie Store
 * An implementation of the [Cookie Store API](https://wicg.github.io/cookie-store)
 * for request handlers. 
 * 
 * It uses the `Cookie` header of a request to populate the store and
 * keeps a record of changes that can be exported as a list of `Set-Cookie` headers.
 * 
 * Note that this is not a polyfill! It is intended as a cookie middleware for Cloudflare Workers,
 * and perhaps some other uses.
 */
export class RequestCookieStore implements CookieStore {
  #origin: URL | null;
  #map: Map<string, string> = new Map();
  #changes: Map<string, string[][]> = new Map();

  constructor(request: Request) {
    const origin = request.headers.get('origin');
    const cookie = request.headers.get('cookie');
    this.#origin = (origin && new URL(origin)) || null;
    this.#map = parseCookieHeader(cookie);
  }

  get(name?: string): Promise<CookieListItem | null>;
  get(options?: CookieStoreGetOptions): Promise<CookieListItem | null>;
  get(options?: string | CookieStoreGetOptions): Promise<CookieListItem | null> {
    // FIXME
    if (typeof options !== 'string') throw Error('Overload not implemented.');

    return Promise.resolve(this.#map.has(options)
      ? { name: options, value: <string>this.#map.get(options) }
      : null);
  }

  getAll(name?: string): Promise<CookieList>;
  getAll(options?: CookieStoreGetOptions): Promise<CookieList>;
  getAll(options?: string | CookieStoreGetOptions): Promise<CookieList> {
    // FIXME
    if (options != null) throw Error('Overload not implemented.');

    return Promise.resolve([...this.#map.entries()].map(([name, value]) => ({ name, value })))
  }

  set(name: string, value: string): Promise<void>;
  set(options: CookieInit): Promise<void>;
  set(options: string | CookieInit, value?: string): Promise<void> {
    const result = setCookie(options, value, this.#origin);
    if (!result) return Promise.resolve();

    const [attributes, expires] = result;
    const [[name, val]] = attributes;
    this.#changes.set(name, attributes);

    if (expires && expires < new Date())
      this.#map.delete(name);
    else
      this.#map.set(name, val);
    return Promise.resolve()
  }

  delete(name: string): Promise<void>;
  delete(options: CookieStoreDeleteOptions): Promise<void>;
  delete(options: string | CookieStoreDeleteOptions): Promise<void> {
    // FIXME
    if (typeof options !== 'string') throw Error('Overload not implemented.');

    const expires = new Date(0);
    const value = '';
    const sameSite = 'strict';
    this.set({ name: options, expires, value, sameSite });
    return Promise.resolve();
  }

  /** 
   * Exports the recorded changes to this store as a list of  `Set-Cookie` headers.
   * 
   * Can be passed as the `headers` field when building a new `Response`:
   * ```ts
   * new Response(body, { headers: cookieStore.headers }) 
   * ```
   */
  get headers(): [string, string][] {
    const headers: [string, string][] = [];
    for (const attrs of this.#changes.values()) {
      headers.push(['Set-Cookie', attrsToSetCookie(attrs)]);
    }
    return headers;
  }

  /** Exports the entire cookie store as a `cookie` header string */
  toCookieString() {
    return [...this.#map.entries()].map(x => x.join('=')).join('; ');
  }

  /** Helper to turn a single `CookieInit` into a `set-cookie` string. 
   * @deprecated Might remove/change name */
  static toSetCookie(cookie: CookieInit): string {
    const x = setCookie(cookie);
    return x ? attrsToSetCookie(x[0]) : '';
  }

  addEventListener(
    _type: string,
    _listener: EventListenerOrEventListenerObject,
    _options?: boolean | AddEventListenerOptions
  ): void {
    throw new Error("Method not implemented.")
  }
  dispatchEvent(_event: Event): boolean {
    throw new Error("Method not implemented.")
  }
  removeEventListener(
    _type: string,
    _callback: EventListenerOrEventListenerObject,
    _options?: boolean | EventListenerOptions
  ): void {
    throw new Error("Method not implemented.")
  }
}

