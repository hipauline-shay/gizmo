import { describe, expect, it, vi } from 'vitest'
import { OpenAIProvider, finalFromEvent } from '../src/providers/openai-provider'
import { GizmoError } from '../src/utilities/errors'

describe('OpenAIProvider', () => {
  it('sends the prompt to OpenAI with a fixed address, no stored copy, and returns the answer', async () => {
    const fetchFn = vi.fn(async () => streamOf(completedEvent('The camera screen is done.')))
    const onCost = vi.fn()
    const provider = createProvider({ fetchFn, onCost })

    const { answer } = await provider.askFollowUp([], 'Is it done?')

    expect(answer).toBe('The camera screen is done.')
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.openai.com/v1/responses')
    expect(init.headers).toMatchObject({ Authorization: 'Bearer sk-proj-test-key' })
    const body = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(body).toMatchObject({ model: 'gpt-6.1-sol', store: false, stream: true })
    expect(String(body.input)).toContain('Is it done?')
    expect(onCost).toHaveBeenCalledWith(expect.closeTo(0.03))
  })

  it('reads an answer split across many network chunks', async () => {
    const event = completedEvent('Split answer.')
    const chunks = event.match(/.{1,7}/gs) ?? []
    const provider = createProvider({ fetchFn: async () => streamOf(...chunks) })

    expect((await provider.askFollowUp([], 'q')).answer).toBe('Split answer.')
  })

  it('stops before sending anything when no OpenAI key is saved', async () => {
    const fetchFn = vi.fn()
    const provider = createProvider({ fetchFn, hasKey: false })

    await expect(provider.askFollowUp([], 'q')).rejects.toMatchObject({ code: 'api-key-missing' })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it.each([
    [401, {}, 'auth-failed'],
    [429, { error: { type: 'insufficient_quota', code: 'insufficient_quota' } }, 'no-credit'],
    [429, { error: { code: 'credit_balance_exhausted' } }, 'no-credit'],
    [429, { error: { code: 'project_spend_limit_exceeded' } }, 'no-credit'],
    [429, { error: { code: 'rate_limit_exceeded' } }, 'rate-limited'],
    [
      400,
      { error: { code: 'context_length_exceeded', message: 'Too long.' } },
      'context-too-large',
    ],
    [400, { error: { message: 'Unknown parameter.' } }, 'unknown'],
    [503, {}, 'busy'],
  ])('turns HTTP %i into a plain "%s" message', async (status, body, code) => {
    const provider = createProvider({
      fetchFn: async () => new Response(JSON.stringify(body), { status }),
    })

    await expect(provider.askFollowUp([], 'q')).rejects.toMatchObject({ code })
  })

  it('reports a dropped connection as a network problem', async () => {
    const provider = createProvider({
      fetchFn: async () => {
        throw new TypeError('fetch failed')
      },
    })

    await expect(provider.askFollowUp([], 'q')).rejects.toMatchObject({ code: 'network' })
  })

  it('says so when the model refuses', async () => {
    const refusal = sse('response.completed', {
      ...finishedResponse(),
      output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'No.' }] }],
    })
    const provider = createProvider({ fetchFn: async () => streamOf(refusal) })

    await expect(provider.askFollowUp([], 'q')).rejects.toMatchObject({ code: 'refused' })
  })

  it('treats a stream that ends without a finished response as a failed read', async () => {
    const provider = createProvider({ fetchFn: async () => streamOf('event: x\ndata: {}\n\n') })

    const error = await provider.askFollowUp([], 'q').catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(GizmoError)
    expect(error).toMatchObject({ code: 'invalid-response' })
  })

  it('still charges and reports a failed response from the stream', async () => {
    const onCost = vi.fn()
    const failed = sse('response.failed', {
      ...finishedResponse(),
      status: 'failed',
      error: { code: 'server_error', message: 'Oops' },
      output: [],
    })
    const provider = createProvider({ fetchFn: async () => streamOf(failed), onCost })

    await expect(provider.askFollowUp([], 'q')).rejects.toMatchObject({ code: 'busy' })
    expect(onCost).toHaveBeenCalled()
  })
})

describe('finalFromEvent', () => {
  it('ignores progress events and unreadable data', () => {
    expect(
      finalFromEvent(
        'event: response.output_text.delta\ndata: {"type":"response.output_text.delta"}',
      ),
    ).toBeUndefined()
    expect(finalFromEvent('data: not json')).toBeUndefined()
    expect(finalFromEvent('data: [DONE]')).toBeUndefined()
  })
})

function createProvider({
  fetchFn,
  onCost,
  hasKey = true,
}: {
  fetchFn: (...args: unknown[]) => Promise<Response>
  onCost?: (usd: number) => void
  hasKey?: boolean
}): OpenAIProvider {
  return new OpenAIProvider({
    getApiKey: async () => (hasKey ? 'sk-proj-test-key' : undefined),
    getModel: () => 'gpt-6.1-sol',
    logger: { info: () => undefined, error: () => undefined },
    onCost,
    fetchFn: fetchFn as typeof fetch,
  })
}

function finishedResponse(): Record<string, unknown> {
  return {
    model: 'gpt-6.1-sol-2026-10-01',
    status: 'completed',
    output: [],
    usage: { input_tokens: 10_000, output_tokens: 1_000 },
  }
}

function completedEvent(text: string): string {
  return sse('response.completed', {
    ...finishedResponse(),
    output: [
      { type: 'reasoning', summary: [] },
      { type: 'message', content: [{ type: 'output_text', text, annotations: [] }] },
    ],
  })
}

function sse(type: string, response: Record<string, unknown>): string {
  const created = `event: response.created\ndata: ${JSON.stringify({ type: 'response.created' })}\n\n`
  return `${created}event: ${type}\ndata: ${JSON.stringify({ type, response })}\n\n`
}

function streamOf(...chunks: string[]): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
  return new Response(body, { status: 200 })
}
