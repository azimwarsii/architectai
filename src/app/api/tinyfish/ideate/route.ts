import { NextRequest } from 'next/server'
import { mockFindProblems, findProblems } from '@/lib/tinyfish'

export async function POST(req: NextRequest) {
  const { domain, focus } = await req.json()

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const useMock = !process.env.TINYFISH_API_KEY || process.env.TINYFISH_API_KEY === 'mock'

        const problems = useMock
          ? await mockFindProblems((line) => send({ type: 'scan_line', line }))
          : await findProblems(domain, focus, (line) => send({ type: 'scan_line', line }))

        send({ type: 'problems', problems })
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
