export const runtime = 'nodejs'

import { registerSSEClient } from '../../../server/api/sse'

const encoder = new TextEncoder()

export async function GET() {
  let client: { close: () => void } | null = null

  const stream = new ReadableStream({
    start(controller) {
      client = registerSSEClient((data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        } catch (error) {
          console.warn('[events] SSE send error', error)
        }
      }, () => {
        try {
          controller.close()
        } catch {
          // ignore
        }
      })

      try {
        controller.enqueue(encoder.encode(': connected\n\n'))
      } catch (error) {
        console.warn('[events] SSE connection error', error)
        client?.close()
      }
    },
    cancel() {
      client?.close()
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
