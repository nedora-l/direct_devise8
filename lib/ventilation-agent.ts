import type { VentilationDocument } from './types'

function toBase64(buf: ArrayBuffer | Uint8Array): string {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i])
  return Buffer.from(s, 'binary').toString('base64')
}

export async function extractVentilation(
  file: File,
  agentUrl = process.env.NEXT_PUBLIC_VENT_AGENT_URL as string
): Promise<VentilationDocument> {
  const ab = await file.arrayBuffer()
  const base64 = toBase64(ab)
  const body = { files: [{ name: file.name, base64 }] }
  const res = await fetch(`${agentUrl}/ventilation/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Schema-Version': 'v2' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`Agent error ${res.status}`)
  return await res.json()
}
