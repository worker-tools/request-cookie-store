// deno-lint-ignore-file no-unused-vars
import 'https://gist.githubusercontent.com/qwtel/b14f0f81e3a96189f7771f83ee113f64/raw/TestRequest.ts'
import { 
  assert,
  assertExists, 
  assertEquals, 
  assertStrictEquals, 
  assertStringIncludes,
  assertThrows,
  assertRejects, 
} from 'https://deno.land/std@0.133.0/testing/asserts.ts'
const { test } = Deno;

import { RequestCookieStore } from '../index.ts';

test('exists', () => {
  assertExists(RequestCookieStore)
})

const request = new Request('/', {
  headers: {
    'Cookie': 'foo=bar; user=bert; no=mad',
  },
})

test('parsed cookies', async () => {
  const store = new RequestCookieStore(request)
  assertEquals(await store.get('foo'), { name: 'foo', value: 'bar' })
  assertEquals(await store.get('user'), { name: 'user', value: 'bert' })
  assertEquals(await store.get('no'), { name: 'no', value: 'mad' })
})

test('setting cookies', async () => {
  const store = new RequestCookieStore(request)
  assertEquals([...store.headers], [])
  await store.set('bee', 'hive')
  assertEquals(await store.get('bee'), { name: 'bee', value: 'hive' })
  const setCookie = new Headers(store.headers).get('set-cookie')!
  assertStringIncludes(setCookie, 'bee=hive');
})

test('setting cookies via object', async () => {
  const store = new RequestCookieStore(request)
  assertEquals([...store.headers], [])
  await store.set({ name: 'bee', value: 'hive' })
  assertEquals(await store.get('bee'), { name: 'bee', value: 'hive' })
  const setCookie = new Headers(store.headers).get('set-cookie')!
  assertStringIncludes(setCookie, 'bee=hive');
})

test('get all', async () => {
  const store = new RequestCookieStore(request)
  const cookies = Object.fromEntries((await store.getAll()).map(({ name, value }) => [name, value]))
  assertEquals(cookies, { foo: 'bar', user: 'bert', no: 'mad' })
})

test('deleting cookies', async () => {
  const store = new RequestCookieStore(request)
  await store.delete('foo')
  const cookies = Object.fromEntries((await store.getAll()).map(({ name, value }) => [name, value]))
  assertEquals(cookies, { user: 'bert', no: 'mad' })
})

test('deleting cookies set-cookie header', async () => {
  const store = new RequestCookieStore(request)
  await store.delete('foo')
  const setCookie = new Headers(store.headers).get('set-cookie')!
  assertStringIncludes(setCookie, 'foo=;')
  assertStringIncludes(setCookie, 'Expires=Thu, 01 Jan 1970 00:00:00 GMT')
})

test('stringifying to cookie string', () => {
  const store = new RequestCookieStore(request)
  assertStrictEquals(store.toCookieString(), 'foo=bar; user=bert; no=mad')
})

test('stringifying to cookie string with modifications', async () => {
  const store = new RequestCookieStore(request)
  await store.set('x', 'y')
  assertStrictEquals(store.toCookieString(), 'foo=bar; user=bert; no=mad; x=y')
})

test('throws for empty values', () => {
  const store = new RequestCookieStore(request)
  assertRejects(() => store.set('', ''), TypeError)
  assertRejects(() => store.set({ name: '', value: '' }), TypeError)
})

test('cookie values with =', async () => {
  const store = new RequestCookieStore(request)
  assertEquals(await store.set('foo', 'bar=x'), undefined)
  assertEquals(await store.get('foo'), { name: 'foo', value: 'bar=x' })
  assertRejects(() => store.set('', 'bar=x'), TypeError)
})

test("cookie values with ', ' sequence", () => {
  const store = new RequestCookieStore(request)
  assertRejects(() => store.set('foo', "a, b, c"), TypeError)
})

test('no control characters', async () => {
  const store = new RequestCookieStore(request)
  store.set('ctrl', "\0") // NUL
  store.set('ctrl', "\x07") // BEL
  store.set('ctrl', "\x08") // BS
  store.set('ctrl', "\x7F") // DELETE
  store.set('ctrl', '\x1B') // ESCAPE
  store.set('ctrl', "\x1E")
  store.set('ctrl', "\x1F")
  // store.set('ctrl', "\x80")
  // store.set('ctrl', "\x9F")
  assertEquals(await store.get('ctrl'), null)
})

test('no defaults', () => {
  const store = new RequestCookieStore(new Request('/'))
  store.set('foo', 'bar')
  const setCookie = new Headers(store.headers).get('set-cookie')!
  assertEquals(setCookie, 'foo=bar')
})

test('no defaults II', () => {
  const store = new RequestCookieStore(new Request('/'))
  store.set({ name: 'foo', value: 'bar' })
  const setCookie = new Headers(store.headers).get('set-cookie')!
  assertEquals(setCookie, 'foo=bar')
})

test('with path', () => {
  const store = new RequestCookieStore(new Request('/'))
  store.set({ name: 'foo', value: 'bar', path: '/' })
  const setCookie = new Headers(store.headers).get('set-cookie')!
  assertEquals(setCookie, 'foo=bar; Path=/')
})

test('paths must start with /', () => {
  const store = new RequestCookieStore(new Request('/'))
  assertRejects(() => store.set({ name: 'foo', value: 'bar', path: 'index.html' }))
})

test('sameSite', () => {
  const store = new RequestCookieStore(new Request('/'))
  store.set({ name: 'foo', value: 'bar', sameSite: 'lax' })
  const setCookie = new Headers(store.headers).get('set-cookie')!
  assertEquals(setCookie, 'foo=bar; SameSite=Lax')
})

test('httpOnly', () => {
  const store = new RequestCookieStore(new Request('/'))
  store.set({ name: 'foo', value: 'bar', httpOnly: true })
  const setCookie = new Headers(store.headers).get('set-cookie')!
  assertEquals(setCookie, 'foo=bar; HttpOnly')
})
