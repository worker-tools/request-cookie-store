import './fixes'
import { jest } from '@jest/globals'

import { RequestCookieStore } from '../index.js';

test('exists', () => {
  expect(RequestCookieStore).toBeDefined
})

const request = new Request('/item/detail?id=3', {
  method: 'POST',
  headers: {
    'Cookie': 'foo=bar; user=bert; no=mad',
  },
})

test('parsed cookies', async () => {
  const store = new RequestCookieStore(request)
  expect(store.get('foo')).resolves.toStrictEqual({ name: 'foo', value: 'bar' })
  expect(store.get('user')).resolves.toStrictEqual({ name: 'user', value: 'bert' })
  expect(store.get('no')).resolves.toStrictEqual({ name: 'no', value: 'mad' })
})

test('setting cookies', async () => {
  const store = new RequestCookieStore(request)
  expect([...store.headers]).toStrictEqual([])
  await store.set('bee', 'hive')
  expect(store.get('bee')).resolves.toStrictEqual({ name: 'bee', value: 'hive' })
  const setCookie = new Headers(store.headers).get('set-cookie')
  expect(setCookie).toContain('bee=hive')
})

test('setting cookies via object', async () => {
  const store = new RequestCookieStore(request)
  expect([...store.headers]).toStrictEqual([])
  await store.set({ name: 'bee', value: 'hive' })
  expect(store.get('bee')).resolves.toStrictEqual({ name: 'bee', value: 'hive' })
  const setCookie = new Headers(store.headers).get('set-cookie')
  expect(setCookie).toContain('bee=hive')
})

test('get all', async () => {
  const store = new RequestCookieStore(request)
  const cookies = Object.fromEntries((await store.getAll()).map(({ name, value }) => [name, value]))
  expect(cookies).toStrictEqual({ foo: 'bar', user: 'bert', no: 'mad' })
})

test('deleting cookies', async () => {
  const store = new RequestCookieStore(request)
  await store.delete('foo')
  const cookies = Object.fromEntries((await store.getAll()).map(({ name, value }) => [name, value]))
  expect(cookies).toStrictEqual({ user: 'bert', no: 'mad' })
})

test('deleting cookies set-cookie header', async () => {
  const store = new RequestCookieStore(request)
  await store.delete('foo')
  const setCookie = new Headers(store.headers).get('set-cookie')
  expect(setCookie).toContain('foo=;')
  expect(setCookie).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT;')
})

test('stringifying to cookie string', () => {
  const store = new RequestCookieStore(request)
  expect(store.toCookieString()).toBe('foo=bar; user=bert; no=mad')
})

test('stringifying to cookie string with modifications', async () => {
  const store = new RequestCookieStore(request)
  await store.set('x', 'y')
  expect(store.toCookieString()).toBe('foo=bar; user=bert; no=mad; x=y')
})

test('throws for empty values', async () => {
  const store = new RequestCookieStore(request)
  expect(store.set('', '')).rejects.toBeInstanceOf(TypeError)
  expect(store.set({ name: '', value: '' })).rejects.toBeInstanceOf(TypeError)
})

test('cookie values with =', async () => {
  const store = new RequestCookieStore(request)
  expect(store.set('foo', 'bar=x')).resolves.toBe(undefined)
  expect(store.get('foo')).resolves.toStrictEqual({ name: 'foo', value: 'bar=x' })
  expect(store.set('', 'bar=x')).rejects.toBeInstanceOf(TypeError)
})

test("cookie values with ', ' sequence", async () => {
  const store = new RequestCookieStore(request)
  expect(store.set('foo', "a, b, c")).rejects.toBeInstanceOf(TypeError)
})
