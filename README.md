# Request Cookie Store
An implementation of the [Cookie Store API](https://wicg.github.io/cookie-store) for request handlers. 

It uses the `Cookie` header of a request to populate the store and
keeps a record of changes that can be exported as a list of `Set-Cookie` headers.

It is intended as a cookie [middleware](https://github.com/worker-tools/middleware) for Cloudflare Workers, but perhaps there are other uses as well.

## Recipes 
The following snippets should convey how this is intended to be used.
Aso see [the interface](./src/interface.ts) for more usage options.


### Creating a New Store
```ts
import { RequestCookieStore } from '@werker/request-cookie-store';

const example = new Request('/', { headers: { 'cookie': 'foo=bar; fizz=buzz' } });

const cookieStore = new RequestCookieStore(example);
```

We can now access cookie values from the store like so:

```ts
const value = (await cookieStore.get(name))?.value;
```

### Fast Read Access
To avoid using `await` for every read, we can parse all cookies into a `Map` once:

```ts
type Cookies = ReadonlyMap<string, string>;

const all = await cookieStore.getAll();
const cookies: Cookies = new Map(all.map(({ name, value }) => [name, value]));

// => Map { "foo" => "bar", "fizz" => "buzz" }
```

### Exporting Headers 
Use `set` on the cookie store to add cookies and include them in a response.
```ts
await cookieStore.set('foo', 'buzz');
await cookieStore.set('fizz', 'bar');

event.respondWith(new Response(null, cookieStore));
```

Will produce the following HTTP:

```http
HTTP/1.1 200 OK
content-length: 0
set-cookie: foo=buzz
set-cookie: fizz=bar
```

Note that [due to the weirdness][1] of the Fetch API `Headers` class, inspecting the response in JS will not produce the intended result!
However, _Cloudflare Workers do put the correct `Set-Cookie` headers on the network!_


### Combine With Other Headers
The above example uses a shortcut. To add additional headers to a response, you can do the following:

```ts
const response = new Response(null, {
  headers: [
    ...new Headers({ 'X-Accept': 'app/json' }),
    ...cookieStore.headers,
  ],
});
// or set imperatively:
response.headers.set('X-Content-Type', 'app/json');
```

[1]: https://fetch.spec.whatwg.org/#headers-class

## Disclaimers
_This is not a polyfill! It is intended as a cookie middleware for Cloudflare Workers!_

[Due to the weirdness][1] of the Fetch API `Headers` class wrt `Set-Cookie` (or rather, the lack of special treatment), it is not likely to work in a Service Worker.
