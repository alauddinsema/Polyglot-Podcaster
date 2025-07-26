import { createClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Custom fetch function that bypasses browser extension interference
const customFetch = (url: RequestInfo | URL, options?: RequestInit) => {
  // Store original fetch
  const originalFetch = window.fetch

  // Create a new fetch request using XMLHttpRequest as fallback
  return new Promise<Response>((resolve, reject) => {
    // Try original fetch first
    originalFetch(url, options)
      .then(resolve)
      .catch((error) => {
        console.warn('Original fetch failed, trying XMLHttpRequest fallback:', error)

        // Fallback to XMLHttpRequest
        const xhr = new XMLHttpRequest()
        const method = options?.method || 'GET'

        xhr.open(method, url.toString())

        // Set headers
        if (options?.headers) {
          const headers = options.headers as Record<string, string>
          Object.entries(headers).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value)
          })
        }

        xhr.onload = () => {
          const response = new Response(xhr.responseText, {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: new Headers(xhr.getAllResponseHeaders().split('\r\n').reduce((acc, line) => {
              const [key, value] = line.split(': ')
              if (key && value) acc[key] = value
              return acc
            }, {} as Record<string, string>))
          })
          resolve(response)
        }

        xhr.onerror = () => reject(new Error('Network request failed'))
        xhr.ontimeout = () => reject(new Error('Network request timed out'))

        xhr.timeout = 30000 // 30 second timeout
        xhr.send(options?.body as string)
      })
  })
}

// Client-side Supabase client with extension-proof fetch
export const createClientComponentClient = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: customFetch
    }
  })
}

// Server-side Supabase client for Server Components
export const createServerComponentClient = async () => {
  const { cookies } = await import('next/headers')
  const cookieStore = cookies()

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

// Server-side Supabase client for Route Handlers
export const createRouteHandlerClient = (request: Request) => {
  const response = new Response()

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.headers.get('cookie')?.split(';')
            .find(c => c.trim().startsWith(`${name}=`))
            ?.split('=')[1]
        },
        set(name: string, value: string, options: any) {
          response.headers.append('Set-Cookie', `${name}=${value}; ${Object.entries(options).map(([k, v]) => `${k}=${v}`).join('; ')}`)
        },
        remove(name: string, options: any) {
          response.headers.append('Set-Cookie', `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; ${Object.entries(options).map(([k, v]) => `${k}=${v}`).join('; ')}`)
        },
      },
    }
  )
}

// Admin client with service role key (for server-side operations)
export const createAdminClient = () => {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}