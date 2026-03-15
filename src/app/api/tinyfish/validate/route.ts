import { NextRequest } from 'next/server'
import { mockValidateIdea, validateIdea } from '@/lib/tinyfish'

export async function POST(req: NextRequest) {
  const { idea, domain } = await req.json()

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const useMock = !process.env.TINYFISH_API_KEY || process.env.TINYFISH_API_KEY === 'mock'

        const results = useMock
          ? await mockValidateIdea((line) => send({ type: 'scan_line', line }))
          : await validateIdea(idea, domain, (line) => send({ type: 'scan_line', line }))

        send({ type: 'results', results })
      } catch (e) {
        send({ type: 'error', message: String(e) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
