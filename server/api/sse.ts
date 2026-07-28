import type { Express, Request, Response } from 'express'

type SSEClient = { id: number; res: Response }

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
    const client: SSEClient = { id, res }
    clients.push(client)

    // initial comment to establish the stream
    try { res.write(`: connected\n\n`) } catch (e) { /* ignore */ }

    req.on('close', () => {
      clients = clients.filter(c => c.id !== id)
    })
  })
}

export function broadcastEvent(event: any) {
  const data = typeof event === 'string' ? event : JSON.stringify(event)
  clients.forEach(client => {
    try {
      client.res.write(`data: ${data}\n\n`)
    } catch (e) {
      // ignore per-client errors
    }
  })
}

export default {}
