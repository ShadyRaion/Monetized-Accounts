export type ExpressRequest = {
  method: string
  url: string
  originalUrl: string
  baseUrl: string
  path: string
  query: Record<string, string | string[]>
  params: Record<string, string>
  body: any
  rawBody?: string
  headers: Record<string, string>
  cookies: Record<string, string>
  user?: { id: string; role: string }
}

export class ExpressResponseAdapter {
  public statusCode = 200
  public headers = new Headers()
  public cookies: string[] = []
  public body: string | ArrayBuffer | null = null
  public ended = false

  status(code: number) {
    this.statusCode = code
    return this
  }

  json(payload: any) {
    if (!this.headers.has('content-type')) {
      this.headers.set('content-type', 'application/json; charset=utf-8')
    }
    this.body = JSON.stringify(payload)
    this.ended = true
    return this
  }

  send(payload: any) {
    if (payload === undefined || payload === null) {
      this.body = ''
    } else if (typeof payload === 'object' && !ArrayBuffer.isView(payload) && !(payload instanceof ArrayBuffer)) {
      return this.json(payload)
    } else {
      if (!this.headers.has('content-type')) {
        this.headers.set('content-type', 'text/plain; charset=utf-8')
      }
      if (typeof payload === 'string') {
        this.body = payload
      } else {
        this.body = payload
      }
    }
    this.ended = true
    return this
  }

  end() {
    this.ended = true
    return this
  }

  setHeader(name: string, value: string) {
    const normalized = name.toLowerCase()
    if (normalized === 'set-cookie') {
      this.cookies.push(value)
      return this
    }
    this.headers.set(name, value)
    return this
  }

  getHeader(name: string) {
    return this.headers.get(name)
  }

  cookie(name: string, value: string, options: Record<string, any> = {}) {
    const cookieValue = encodeURIComponent(value)
    let cookie = `${name}=${cookieValue}; Path=${options.path || '/'};`

    if (options.httpOnly) cookie += ' HttpOnly;'
    if (options.secure) cookie += ' Secure;'
    if (options.sameSite) cookie += ` SameSite=${options.sameSite};`
    if (options.expires) {
      const expires = options.expires instanceof Date ? options.expires.toUTCString() : new Date(options.expires).toUTCString()
      cookie += ` Expires=${expires};`
    }
    if (typeof options.maxAge === 'number') {
      cookie += ` Max-Age=${options.maxAge};`
    }

    this.cookies.push(cookie)
    return this
  }

  clearCookie(name: string, options: Record<string, any> = {}) {
    return this.cookie(name, '', {
      ...options,
      expires: new Date(0),
      maxAge: 0,
    })
  }
}

const parseCookieHeader = (value: string | null) => {
  const cookies: Record<string, string> = {}
  if (!value) return cookies
  for (const part of value.split(';')) {
    const [rawName, ...rest] = part.split('=')
    const name = rawName?.trim()
    const val = rest.join('=').trim()
    if (!name) continue
    cookies[name] = decodeURIComponent(val)
  }
  return cookies
}

export const createExpressRequest = async (req: Request, params: Record<string, string> = {}): Promise<ExpressRequest> => {
  const url = new URL(req.url)
  const headers: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value
  })

  const query: Record<string, string | string[]> = {}
  url.searchParams.forEach((value, key) => {
    if (key in query) {
      const existing = query[key]
      query[key] = Array.isArray(existing) ? [...existing, value] : [existing, value]
    } else {
      query[key] = value
    }
  })

  const contentType = headers['content-type'] ?? ''
  let rawBody = ''
  let body: any = undefined

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (contentType.startsWith('image/') || contentType.includes('application/octet-stream')) {
      const arrayBuffer = await req.arrayBuffer()
      body = Buffer.from(arrayBuffer)
      rawBody = body.toString('base64')
    } else {
      rawBody = await req.text()

      if (contentType.includes('application/json')) {
        try {
          body = rawBody ? JSON.parse(rawBody) : {}
        } catch {
          body = rawBody
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(rawBody)
        body = Object.fromEntries(params.entries())
      } else if (rawBody.trim().startsWith('{') || rawBody.trim().startsWith('[')) {
        try {
          body = JSON.parse(rawBody)
        } catch {
          body = rawBody
        }
      } else {
        body = rawBody
      }
    }
  }

  return {
    method: req.method,
    url: url.pathname + url.search,
    originalUrl: url.pathname + url.search,
    baseUrl: '/api',
    path: url.pathname,
    query,
    params,
    body,
    rawBody,
    headers,
    cookies: parseCookieHeader(req.headers.get('cookie')),
  }
}

export const toNextResponse = (res: ExpressResponseAdapter) => {
  const headers = new Headers(res.headers)
  for (const cookie of res.cookies) {
    headers.append('Set-Cookie', cookie)
  }
  const body = res.body === null ? '' : res.body
  return new Response(body, {
    status: res.statusCode,
    headers,
  })
}

export const runMiddleware = async (
  middleware: (req: any, res: any, next: (err?: any) => void) => void | Promise<void>,
  req: ExpressRequest,
  res: ExpressResponseAdapter,
) => {
  let nextCalled = false

  return await new Promise<boolean>((resolve, reject) => {
    const next = (err?: any) => {
      if (err) {
        reject(err)
        return
      }
      nextCalled = true
      resolve(!res.ended)
    }

    // Run the middleware and if it resolves without calling `next`,
    // check if it ended the response and resolve accordingly to avoid hangs.
    Promise.resolve(middleware(req as any, res as any, next))
      .then(() => {
        if (res.ended) {
          resolve(false)
        }
        // If middleware returned but didn't end response, we wait for `next` to be called.
      })
      .catch(reject)
  })
}
