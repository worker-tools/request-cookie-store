# Request Cookie Store
An implementation of the [Cookie Store API](https://wicg.github.io/cookie-store) for request handlers. 

It uses the `Cookie` header of a request to populate the store and
keeps a record of changes that can be exported as a list of `Set-Cookie` headers.

It is intended as a cookie middleware for Cloudflare Workers or other [Worker Environments][wks], but perhaps there are other uses as well.
It is best combined with [**Signed Cookie Store**](../signed-cookie-store) or [**Encrypted Cookie Store**](../encrypted-cookie-store).

## Recipes 
The following snippets should convey how this is intended to be used.
Aso see [the interface](./src/interface.ts) for more usage options.


### Creating a New Store
```ts
import { RequestCookieStore } from '@worker-tools/request-cookie-store';

// Creating a request on the fly. Typically it will be provided by CF Workers, etc.
const request = new Request('/', { headers: { 'cookie': 'foo=bar; fizz=buzz' } });

const cookieStore = new RequestCookieStore(request);
```

We can now access cookie values from the store like so:

```ts
const value = (await cookieStore.get(name))?.value;
```

This is a bit verbose, so we'll make it more ergonomic in the next step.

### Fast Read Access
To avoid using `await` for every read, we can parse all cookies into a `Map` once:

```ts
type Cookies = ReadonlyMap<string, string>;

const all = await cookieStore.getAll();

new Map(all.map(({ name, value }) => [name, value])) as Cookies;
// => Map { "foo" => "bar", "fizz" => "buzz" }
```

### Exporting Headers 
Use `set` on the cookie store to add cookies and include them in a response.
```ts
await cookieStore.set('foo', 'buzz');
await cookieStore.set('fizz', 'bar');

event.respondWith(new Response(null, cookieStore));
```

Will produce the following HTTP headers in Worker Environments that support multiple `Set-Cookie` headers:

```http
HTTP/1.1 200 OK
content-length: 0
set-cookie: foo=buzz
set-cookie: fizz=bar
```

<!-- Note that [due to the weirdness][1] of the `Headers` class, inspecting the response in JS will not produce the intended result (`set-cookie` headers will appear concatenated). 
However, Worker Environments such as Cloudflare Workers will put multiple headers on the network when provided a "[header list](https://fetch.spec.whatwg.org/#concept-header-list)", i.e. an array of tuples. -->


### Combine With Other Headers
The above example above uses the fact that the cookie store will correctly destructure the `headers` key. 
To add additional headers to a response, you can do the following:

```ts
const response = new Response('{}', {
  headers: [
    ['content-type': 'application/json'],
    ...cookieStore.headers,
  ],
});
```

[1]: https://fetch.spec.whatwg.org/#headers-class

## Disclaimers
_This is not a polyfill! It is intended as a cookie middleware for Cloudflare Workers or other [Worker Environments][wks]!_

[Due to the weirdness][1] of the Fetch API `Headers` class w.r.t `Set-Cookie` (or rather, the lack of special treatment), it is not likely to work in a Service Worker.

[wks]: https://workers.js.org/