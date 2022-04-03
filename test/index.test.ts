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
  method: 'POST',
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
  assertStringIncludes(setCookie, 'Expires=Thu, 01 Jan 1970 00:00:00 GMT;')
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
