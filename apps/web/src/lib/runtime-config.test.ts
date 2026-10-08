import { afterEach, describe, expect, it } from 'vitest'
import { getRuntimeConfig } from './runtime-config'

afterEach(() => {
  delete window.__AXIA_CONFIG__
})

describe('getRuntimeConfig', () => {
  it('usa la configuración de runtime cuando existe', () => {
    window.__AXIA_CONFIG__ = {
      supabaseUrl: 'https://supabase.ejemplo',
      supabaseAnonKey: 'anon-de-runtime',
    }

    expect(getRuntimeConfig()).toEqual({
      supabaseUrl: 'https://supabase.ejemplo',
      supabaseAnonKey: 'anon-de-runtime',
    })
  })

  it('cae a las variables de build cuando no hay runtime', () => {
    const config = getRuntimeConfig()

    expect(config.supabaseUrl).toBe('http://127.0.0.1:54321')
    expect(config.supabaseAnonKey).toBe('clave-anon-de-prueba')
  })
})
