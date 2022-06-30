# Request Cookie Store
An implementation of the [Cookie Store API](https://wicg.github.io/cookie-store) for request handlers. 

It uses the `Cookie` header of a request to populate the store and
keeps a record of changes that can be exported as a list of `Set-Cookie` headers.

It is intended as a cookie middleware for Cloudflare Workers or other [Worker Runtimes][wks], but perhaps there are other uses as well.
It is best combined with [**Signed Cookie Store**](https://github.com/worker-tools/signed-cookie-store) or [**Encrypted Cookie Store**](https://github.com/worker-tools/encrypted-cookie-store).

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

Will produce the following HTTP headers in Worker Runtimes that support multiple `Set-Cookie` headers:

```http
HTTP/1.1 200 OK
content-length: 0
set-cookie: foo=buzz
set-cookie: fizz=bar
```

<!-- Note that [due to the weirdness][1] of the `Headers` class, inspecting the response in JS will not produce the intended result (`set-cookie` headers will appear concatenated). 
However, Worker Runtimes such as Cloudflare Workers will put multiple headers on the network when provided a "[header list](https://fetch.spec.whatwg.org/#concept-header-list)", i.e. an array of tuples. -->


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
_This is not a polyfill! It is intended as a cookie middleware for Cloudflare Workers or other [Worker Runtimes][wks]!_

[Due to the weirdness][1] of the Fetch API `Headers` class w.r.t `Set-Cookie` (or rather, the lack of special treatment), it is not likely to work in a Service Worker.

[wks]: https://workers.js.org/

<br/>

--------

<br/>

<p align="center"><a href="https://workers.tools"><img src="https://workers.tools/assets/img/logo.svg" width="100" height="100" /></a>
<p align="center">This module is part of the Worker Tools collection<br/>⁕

[Worker Tools](https://workers.tools) are a collection of TypeScript libraries for writing web servers in [Worker Runtimes](https://workers.js.org) such as Cloudflare Workers, Deno Deploy and Service Workers in the browser. 

If you liked this module, you might also like:

- 🧭 [__Worker Router__][router] --- Complete routing solution that works across CF Workers, Deno and Service Workers
- 🔋 [__Worker Middleware__][middleware] --- A suite of standalone HTTP server-side middleware with TypeScript support
- 📄 [__Worker HTML__][html] --- HTML templating and streaming response library
- 📦 [__Storage Area__][kv-storage] --- Key-value store abstraction across [Cloudflare KV][cloudflare-kv-storage], [Deno][deno-kv-storage] and browsers.
- 🆗 [__Response Creators__][response-creators] --- Factory functions for responses with pre-filled status and status text
- 🎏 [__Stream Response__][stream-response] --- Use async generators to build streaming responses for SSE, etc...
- 🥏 [__JSON Fetch__][json-fetch] --- Drop-in replacements for Fetch API classes with first class support for JSON.
- 🦑 [__JSON Stream__][json-stream] --- Streaming JSON parser/stingifier with first class support for web streams.

Worker Tools also includes a number of polyfills that help bridge the gap between Worker Runtimes:
- ✏️ [__HTML Rewriter__][html-rewriter] --- Cloudflare's HTML Rewriter for use in Deno, browsers, etc...
- 📍 [__Location Polyfill__][location-polyfill] --- A `Location` polyfill for Cloudflare Workers.
- 🦕 [__Deno Fetch Event Adapter__][deno-fetch-event-adapter] --- Dispatches global `fetch` events using Deno’s native HTTP server.

[router]: https://workers.tools/router
[middleware]: https://workers.tools/middleware
[html]: https://workers.tools/html
[kv-storage]: https://workers.tools/kv-storage
[cloudflare-kv-storage]: https://workers.tools/cloudflare-kv-storage
[deno-kv-storage]: https://workers.tools/deno-kv-storage
[kv-storage-polyfill]: https://workers.tools/kv-storage-polyfill
[response-creators]: https://workers.tools/response-creators
[stream-response]: https://workers.tools/stream-response
[json-fetch]: https://workers.tools/json-fetch
[json-stream]: https://workers.tools/json-stream
[request-cookie-store]: https://workers.tools/request-cookie-store
[extendable-promise]: https://workers.tools/extendable-promise
[html-rewriter]: https://workers.tools/html-rewriter
[location-polyfill]: https://workers.tools/location-polyfill
[deno-fetch-event-adapter]: https://workers.tools/deno-fetch-event-adapter

Fore more visit [workers.tools](https://workers.tools).