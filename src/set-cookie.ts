import { CookieInit } from 'cookie-store-interface';

export const attrsToSetCookie = (attrs: string[][]) => attrs.map(att => att.join('=')).join('; ');

/** Matches control characters. TODO: more comprehensive list? */
const RE_CONTROL = /\p{Cc}/u;

type Attr = [string] | [string, string];
type Attrs = [[string, string], ...Attr[]];

/**
 * Implements <https://wicg.github.io/cookie-store/#set-a-cookie>
 * with some additional behaviors taken from Chrome's implementation.
 */
export function setCookie(options: string | CookieInit, value?: string, origin?: URL | null): null | [Attrs, Date | null] {
  const [name, val] = (typeof options === 'string'
    ? [options, value]
    : [options.name, options.value]).map(x => x?.toString())

  if (name == null || val == null)
    throw TypeError("required value(s) missing");
  if (!name.length && val.includes('='))
    throw TypeError("Cookie value cannot contain '=' if the name is empty");
  if (!name.length && !val.length)
    throw TypeError("Cookie name and value both cannot be empty");

  // Unspecified, emulating Chrome's current behavior 
  if (RE_CONTROL.test(name + val) || name.includes('=') || val.includes(';'))
    return null;

  if (val.includes(', ')) {
    throw TypeError("The cookie value must not contain sequence: ', '.");
  }

  const attrs: Attrs = [[name, val]];
  const host = origin?.host;
  let expires: Date | null = null;

  if (typeof options !== 'string') {
    const { domain, path = '/', sameSite = 'strict' } = options;

    if (domain) {
      // Unspecified, emulating Chrome's current behavior 
      const d = domain.toString();

      if (RE_CONTROL.test(d) || domain.includes(';'))
        return null;

      if (d.startsWith('.'))
        throw TypeError('Cookie domain cannot start with "."');

      if (host && !host.endsWith(`.${d}`))
        throw TypeError('Cookie dom must domain-match current host');

      attrs.push(['Domain', d]);
    }

    if (options.expires) {
      expires = options.expires instanceof Date
        ? options.expires
        : new Date(options.expires);
      attrs.push(['Expires', expires.toUTCString()]);
    }

    {
      if (!path?.toString().startsWith('/'))
        throw TypeError('Cookie path must start with "/"');

      // Unspecified, emulating Chrome's current behavior 
      if (RE_CONTROL.test(path) || path.includes(';'))
        return null;

      attrs.push(['Path', path]);
    }

    // Altercated to allow for missing origin
    // TODO: should that be a thing?
    if (origin && origin.hostname !== 'localhost')
      attrs.push(['Secure']);

    // Unspecified
    if (options.httpOnly)
      attrs.push(['HttpOnly']);

    switch (sameSite) {
      case 'none': attrs.push(['SameSite', 'None']); break;
      case 'lax': attrs.push(['SameSite', 'Lax']); break;
      case 'strict': attrs.push(['SameSite', 'Strict']); break;
      default: throw TypeError(`The provided value '${sameSite}' is not a valid enum value of type CookieSameSite.`);
    }
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
    .map(([n, ...vs]) => [n.trim(), vs.join('=').trim()] as const)
    .filter(([n, v]) => !(n === '' && v === ''))
  );
}
