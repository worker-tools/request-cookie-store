import {
  CookieStore,
  CookieListItem,
  CookieList,
  CookieInit,
  CookieStoreGetOptions,
  CookieStoreDeleteOptions,
} from "./interface";

import { setCookie, attrsToSetCookie, parseCookieHeader } from './set-cookie';

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
  #store: Map<string, string> = new Map();
  #changes: Map<string, string[][]> = new Map();

  constructor(request: Request) {
    const origin = request.headers.get('origin');
    const cookie = request.headers.get('cookie');
    this.#origin = (origin && new URL(origin)) || null;
    this.#store = parseCookieHeader(cookie);
  }

  async get(options: string | CookieStoreGetOptions): Promise<CookieListItem> {
    // FIXME
    if (typeof options !== 'string') throw Error('Overload not implemented.');

    return this.#store.has(options)
      ? { name: options, value: this.#store.get(options) }
      : null;
  }

  async getAll(options?: string | CookieStoreGetOptions): Promise<CookieList> {
    // FIXME
    if (options != null) throw Error('Overload not implemented.');

    return [...this.#store.entries()].map(([name, value]) => ({ name, value }))
  }

  async set(options: string | CookieInit, value?: string) {
    const result = setCookie(options, value, this.#origin);
    if (!result) return null;

    const [attributes, expires] = result;
    const [[name, val]] = attributes;
    this.#changes.set(name, attributes);

    if (expires && expires < new Date())
      this.#store.delete(name);
    else
      this.#store.set(name, val);
  }

  async delete(options: string | CookieStoreDeleteOptions) {
    // FIXME
    if (typeof options !== 'string') throw Error('Overload not implemented.');

    const expires = new Date(0);
    const value = '';
    const sameSite = 'strict';
    this.set({ name: options, expires, value, sameSite });
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
    const headers = [];
    for (const attrs of this.#changes.values()) {
      headers.push(['Set-Cookie', attrsToSetCookie(attrs)]);
    }
    return headers;
  }

  /** Exports the entire cookie store as a `cookie` header string */
  toCookieString() {
    return [...this.#store.entries()].map(x => x.join('=')).join('; ');
  }

  /** Helper to turn a single `CookieInit` into a `set-cookie` string. */
  static toSetCookie(cookie: CookieInit): string {
    const [attrs] = setCookie(cookie);
    return attrsToSetCookie(attrs);
  }

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    throw new Error("Method not implemented.")
  }
  dispatchEvent(event: Event): boolean {
    throw new Error("Method not implemented.")
  }
  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void {
    throw new Error("Method not implemented.")
  }
}

export * from './interface';
