// deno-lint-ignore-file no-control-regex
import type { CookieInit } from 'https://ghuc.cc/qwtel/cookie-store-interface/index.d.ts';

export const attrsToSetCookie = (attrs: string[][]) => attrs.map(att => att.join('=')).join('; ');

/**
 * RegExp to match field-content in RFC 7230 sec 3.2
 *
 * field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 * field-vchar   = VCHAR / obs-text
 * obs-text      = %x80-FF
 */
const RE_FIELD_CONTENT = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;

type Attr = [string] | [string, string];
type Attrs = [[string, string], ...Attr[]];

/**
 * Implements <https://wicg.github.io/cookie-store/#set-a-cookie>
 * with some additional behaviors taken from Chrome's implementation.
 */
export function setCookie(
  options: string | CookieInit,
  value?: string,
  origin?: URL | null,
  encode = (x?: string) => x?.toString() ?? '',
): [Attrs, Date | null] | null {
  const [name, val] = (typeof options === 'string'
    ? [options, value]
    : [options.name, options.value]).map(encode)

  const opts = typeof options === 'string' ? <CookieInit>{} : options;

  if (name == null || val == null)
    throw TypeError("required value(s) missing");
  if (!name.length && val.includes('='))
    throw TypeError("Cookie value cannot contain '=' if the name is empty");
  if (!name.length && !val.length)
    throw TypeError("Cookie name and value both cannot be empty");

  // Unspecified, emulating Chrome's current behavior 
  if (!RE_FIELD_CONTENT.test(name + val) || name.includes('=') || val.includes(';'))
    return null;

  if (val.includes(', ')) {
    throw TypeError("The cookie value must not contain sequence: ', '.");
  }

  const attrs: Attrs = [[name, val]];

  const { domain, path, sameSite } = opts;

  if (domain) {
    // Unspecified, emulating Chrome's current behavior 
    if (!RE_FIELD_CONTENT.test(domain) || domain.includes(';'))
      return null;

    if (domain.startsWith('.'))
      throw TypeError('Cookie domain cannot start with "."');

    const host = origin?.host;
    if (host && !host.endsWith(`.${domain}`))
      throw TypeError('Cookie domain must match current host');

    attrs.push(['Domain', domain]);
  }

  let expires: Date | null = null;
  if (opts.expires) {
    expires = opts.expires instanceof Date
      ? opts.expires
      : new Date(opts.expires);
    attrs.push(['Expires', expires.toUTCString()]);
  }

  if (path) {
    if (!path.toString().startsWith('/'))
      throw TypeError('Cookie path must start with "/"');

    // Unspecified, emulating Chrome's current behavior 
    if (!RE_FIELD_CONTENT.test(path) || path.includes(';'))
      return null;

    attrs.push(['Path', path]);
  }

  // Always secure, except for localhost
  if (origin && origin.hostname !== 'localhost')
    attrs.push(['Secure']);

  if (opts.httpOnly)
    attrs.push(['HttpOnly']);

  switch (sameSite) {
    case undefined: break;
    case 'none': attrs.push(['SameSite', 'None']); break;
    case 'lax': attrs.push(['SameSite', 'Lax']); break;
    case 'strict': attrs.push(['SameSite', 'Strict']); break;
    default: throw TypeError(`The provided value '${sameSite}' is not a valid enum value of type CookieSameSite.`);
  }

  return [attrs, expires]
}

/** 
 * A not-so-strict parser for cookie headers.
 * - Allows pretty much everything in the value, including `=` 
 * - Trims keys and values
 * - Ignores when both name and value are empty (but either empty allowed)
 * 
 * For more on the state of allowed cookie characters, 
 * see <https://stackoverflow.com/a/1969339/870615>.
 */
export function parseCookieHeader(cookie?: string | null) {
  return new Map(cookie?.split(/;\s+/)
    .map(x => x.split('='))
    .map(([n, ...vs]) => <const>[n.trim(), vs.join('=').trim()])
    .filter(([n, v]) => !(n === '' && v === ''))
  );
}
