import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'

test('HTTP API requires a session, rejects cross-origin writes and reports missing setup', async () => {
  delete process.env.MONGODB_URI
  const { default: app } = await import('../server/app.js')
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}/api`
  try {
    const state = await fetch(`${base}/state`)
    assert.equal(state.status, 401)
    assert.equal((await state.json()).error, 'Please sign in to continue.')
    const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@test.invalid', password: 'no-account' }) })
    assert.equal(login.status, 503)
    assert.match((await login.json()).error, /database is not configured/i)
    const signup = await fetch(`${base}/auth/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'New Owner', email: 'owner@example.test', password: 'a-long-test-password', propertyName: 'New Hotel', timezone: 'UTC', currency: 'USD' }) })
    assert.equal(signup.status, 503)
    assert.match((await signup.json()).error, /database is not configured/i)
    const csrf = await fetch(`${base}/guests`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://another-site.invalid' }, body: '{}' })
    assert.equal(csrf.status, 403)
    const form = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'email=test' })
    assert.equal(form.status, 415)
    const health = await fetch(`${base}/health`)
    assert.equal(health.status, 503, 'Health must not claim a database connection when configuration is missing.')
  } finally {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
})
