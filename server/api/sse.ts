import type { Express, Request, Response } from 'express'

type SSEClient = { id: number; res?: Response; send?: (message: string) => void }

let clients: SSEClient[] = []
let clientIdCounter = 1

export function initSSE(app: Express) {
  app.get('/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    if (typeof (res as any).flushHeaders === 'function') {
      ;(res as any).flushHeaders()
    }

    const id = clientIdCounter++
    const client: SSEClient = {
      id,
      res,
      send: (message: string) => {
        try {
          res.write(message)
        } catch (e) {
          // ignore
        }
      },
    }
    clients.push(client)

    try { res.write(`: connected\n\n`) } catch (e) { /* ignore */ }

    req.on('close', () => {
      clients = clients.filter(c => c.id !== id)
    })
  })
}

export function registerSSEClient(onMessage: (message: string) => void, onClose: () => void) {
  const id = clientIdCounter++
  const client: SSEClient = {
    id,
    send: onMessage,
  }
  clients.push(client)

  return {
    id,
    close: () => {
      clients = clients.filter(c => c.id !== id)
      onClose()
    },
  }
}

export function broadcastEvent(event: any) {
  const data = typeof event === 'string' ? event : JSON.stringify(event)
  clients.forEach(client => {
    try {
      client.send?.(`data: ${data}\n\n`)
    } catch (e) {
      // ignore per-client errors
    }
  })
}

export default {}
