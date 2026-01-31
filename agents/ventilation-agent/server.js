const http = require('http')
const url = require('url')
const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const { execFile } = require('child_process')
const https = require('https')
let pdfParse
try { pdfParse = require('pdf-parse') } catch {}

function loadEnvFile(p) {
  try {
    if (!fs.existsSync(p)) return
    const content = fs.readFileSync(p, 'utf8')
    const lines = content.split(/\r?\n/)
    for (const line of lines) {
      if (!line || line.trim().startsWith('#')) continue
      const idx = line.indexOf('=')
      if (idx === -1) continue
      const k = line.slice(0, idx).trim()
      let v = line.slice(idx + 1).trim()
      if ((v.startsWith("\"") && v.endsWith("\"")) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      if (!process.env[k]) process.env[k] = v
    }
  } catch {}
}
loadEnvFile(path.join(process.cwd(), '.env'))
loadEnvFile(path.join(process.cwd(), '.env.local'))

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8787
const PDFTOPPM_PATH = process.env.PDFTOPPM_PATH || 'pdftoppm'
const PROVIDER = (process.env.LLM_PROVIDER || 'openai').toLowerCase()
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const GEMINI_API_KEY = process.env.LLM_API_KEY || process.env.GEMINI_API_KEY || ''
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview'
const GROK_API_KEY = process.env.GROK_API_KEY || ''
const GROK_MODEL = process.env.GROK_MODEL || 'grok-vision-beta'
const OCR_SPACE_KEY = process.env.OCR_SPACE_KEY || ''

try {
  console.log('[env]', { PROVIDER, hasOpenAI: !!OPENAI_API_KEY, hasGemini: !!GEMINI_API_KEY, hasGrok: !!GROK_API_KEY, hasOCR: !!OCR_SPACE_KEY, openaiModel: OPENAI_MODEL, geminiModel: GEMINI_MODEL, grokModel: GROK_MODEL })
} catch {}

function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(data)) } catch (e) { reject(e) }
    })
    req.on('error', err => reject(err))
  })
}

function detectTypeFromBase64(b64) {
  const buf = Buffer.from(b64, 'base64')
  if (buf.length >= 4) {
    const s = buf.slice(0, 5).toString('latin1')
    if (s.startsWith('%PDF-')) return 'pdf'
  }
  if (buf.length >= 8) {
    const h = buf.slice(0, 8)
    if (h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4E && h[3] === 0x47) return 'png'
  }
  if (buf.length >= 3) {
    const h = buf.slice(0, 3)
    if (h[0] === 0xFF && h[1] === 0xD8 && h[2] === 0xFF) return 'jpeg'
  }
  return 'unknown'
}

function writeTempFile(prefix, ext, dataBuf) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vent-'))
  const file = path.join(dir, `${prefix}.${ext}`)
  fs.writeFileSync(file, dataBuf)
  return { dir, file }
}

function convertPdfToPngs(pdfPath) {
  return new Promise((resolve, reject) => {
    const outPrefix = path.join(path.dirname(pdfPath), 'page')
    const args = [pdfPath, outPrefix, '-png', '-r', '150']
    const bin = findPdftoppmPath()
    const child = execFile(bin, args, { windowsHide: true }, (err) => {
      if (err) {
        return reject(new Error('pdftoppm_not_available'))
      }
      try {
        const files = fs.readdirSync(path.dirname(pdfPath))
        const pages = files.filter(f => /^page-\d+\.png$/.test(f)).map(f => path.join(path.dirname(pdfPath), f))
        if (pages.length === 0) return reject(new Error('no_pages'))
        resolve(pages)
      } catch (e) {
        reject(e)
      }
    })
  })
}

function findPdftoppmPath() {
  const candidateEnv = PDFTOPPM_PATH
  if (candidateEnv && fs.existsSync(candidateEnv)) return candidateEnv
  const guesses = []
  const chocoRoot = 'C\\ProgramData\\chocolatey\\lib\\poppler\\tools'
  const userRoot = path.join(process.env.USERPROFILE || 'C:\\Users\\Public', 'AppData', 'Local', 'poppler')
  guesses.push(path.join(chocoRoot, 'poppler-25.12.0', 'bin', 'pdftoppm.exe'))
  guesses.push(path.join(chocoRoot, 'bin', 'pdftoppm.exe'))
  guesses.push(path.join(userRoot, 'bin', 'pdftoppm.exe'))
  for (const g of guesses) { if (fs.existsSync(g)) { PDFTOPPM_PATH = g; return g } }
  // last resort: rely on PATH
  return candidateEnv || 'pdftoppm'
}

async function tryParsePdfText(pdfBuf) {
  if (!pdfParse) return null
  try {
    const data = await pdfParse(pdfBuf)
    const text = (data && data.text) ? String(data.text).trim() : ''
    if (text && text.length > 200) return text
    return null
  } catch { return null }
}

function readFileBase64(p) {
  const buf = fs.readFileSync(p)
  return buf.toString('base64')
}

function buildOpenAIRequest(segments) {
  const system = "Tu es VENT-EX. Page 1 = Header + Tableau; suivantes = Tableau seul. Retourne STRICTEMENT le JSON selon le schéma unifié. Ignore les lignes qui commencent par 'Total'."
  const content = []
  content.push({ type: 'text', text: 'Analyse ces pages et renvoie le JSON conforme.' })
  for (const seg of segments) {
    if (seg.kind === 'text') {
      content.push({ type: 'text', text: seg.text })
    } else if (seg.kind === 'image') {
      content.push({ type: 'image_url', image_url: { url: `data:${seg.mime};base64,${seg.b64}` } })
    }
  }
  return {
    model: OPENAI_MODEL,
    response_format: { type: 'json_object' },
    temperature: 0,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content }
    ]
  }
}

function callOpenAI(payload) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      method: 'POST',
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }, res => {
      let data = ''
      res.on('data', d => { data += d })
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const j = JSON.parse(data)
            const c = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content
            if (!c) return reject(new Error('no_content'))
            let out
            try { out = JSON.parse(c) } catch { out = c }
            resolve(out)
          } catch (e) { reject(e) }
        } else {
          reject(new Error(`openai_${res.statusCode}`))
        }
      })
    })
    req.on('error', err => reject(err))
    req.write(JSON.stringify(payload))
    req.end()
  })
}

function buildGrokRequest(segments) {
  const system = "Tu es VENT-EX. Page 1 = Header + Tableau; suivantes = Tableau seul. Retourne STRICTEMENT le JSON selon le schéma unifié. Ignore les lignes qui commencent par 'Total'."
  const content = []
  content.push({ type: 'text', text: 'Analyse ces pages et renvoie le JSON conforme.' })
  for (const seg of segments) {
    if (seg.kind === 'text') {
      content.push({ type: 'text', text: seg.text })
    } else if (seg.kind === 'image') {
      content.push({ type: 'image_url', image_url: { url: `data:${seg.mime};base64,${seg.b64}` } })
    }
  }
  return {
    model: GROK_MODEL,
    response_format: { type: 'json_object' },
    temperature: 0,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content }
    ],
    max_tokens: 3000,
    tools: [{ type: 'web_search', enable_image_understanding: true }],
    tool_choice: 'auto'
  }
}

function callGrok(payload) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      method: 'POST',
      hostname: 'api.x.ai',
      path: '/v1/chat/completions',
      headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }, res => {
      let data = ''
      res.on('data', d => { data += d })
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const j = JSON.parse(data)
            const c = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content
            if (!c) return reject(new Error('no_content'))
            let out
            try { out = JSON.parse(c) } catch { out = c }
            resolve(out)
          } catch (e) { reject(e) }
        } else {
          reject(new Error(`grok_${res.statusCode}`))
        }
      })
    })
    req.on('error', err => reject(err))
    req.write(JSON.stringify(payload))
    req.end()
  })
}

function callOCRSpace(mime, b64, typeHint) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      base64Image: `data:${mime};base64,${b64}`,
      language: 'fre',
      isOverlayRequired: 'true',
      isTable: 'true',
      OCREngine: '2',
      scale: 'true'
    })
    if (typeHint) body.append('fileType', typeHint)
    const req = https.request({
      method: 'POST',
      hostname: 'api.ocr.space',
      path: '/parse/image',
      headers: {
        'apikey': OCR_SPACE_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, res => {
      let data = ''
      res.on('data', d => { data += d })
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const j = JSON.parse(data)
            if (j.IsErroredOnProcessing) return reject(new Error(Array.isArray(j.ErrorMessage) ? j.ErrorMessage.join(' ') : String(j.ErrorMessage || 'ocr_error')))
            resolve(j)
          } catch (e) { reject(e) }
        } else {
          reject(new Error(`ocrspace_${res.statusCode}`))
        }
      })
    })
    req.on('error', err => reject(err))
    req.write(body.toString())
    req.end()
  })
}

function extractFromText(text, patterns) {
  const re = new RegExp(patterns.join('|'), 'i')
  const m = text.match(re)
  return m ? m[0].trim() : ''
}

function buildVentilationFromOCR(ocrJson, textSegments) {
  const results = Array.isArray(ocrJson.ParsedResults) ? ocrJson.ParsedResults : []
  const pageTexts = results.map(r => (r && r.ParsedText) ? String(r.ParsedText) : '')
  for (const t of textSegments) pageTexts.push(t)
  let fullText = pageTexts.join('\n\n---PAGE---\n')
  fullText = fullText
    .replace(/Ã©/g, 'é')
    .replace(/Ã¨/g, 'è')
    .replace(/Ã€/g, 'À')
    .replace(/Ã€/g, 'à')
    .replace(/Ã§/g, 'ç')
    .replace(/Ã´/g, 'ô')
    .replace(/Ã»/g, 'û')
    .replace(/Â/g, '')
  const lines = fullText.split(/\r?\n/).map(l => l.trim()).filter(l => l)
  const headerText = results[0] && results[0].ParsedText ? String(results[0].ParsedText) : (textSegments[0] || '')
  const totalMatch = fullText.match(/(?:solde.*?(\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d+)?))|(?:total\s+général.*?(\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d+)?))|(?:montant\s+total.*?(\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d+)?))/i)
  const totalGroup = totalMatch && (totalMatch[1] || totalMatch[2] || totalMatch[3])
  const total = totalGroup ? parseFloat(totalGroup.replace(/[.,\s]/g, '').replace(',', '.')) : 0
  const out = {
    SourceDocument: 'VENTILATION',
    PageInfo: { EstPageGarde: /garde|cover/i.test(fullText), NumeroPageDetecte: null },
    Header: {
      nom: extractFromText(headerText, ['nom', 'entreprise', 'RC', 'raison sociale']),
      adresse: extractFromText(headerText, ['adresse', 'siège', 'local']),
      date: extractFromText(headerText, ['date', 'émission', 'du \\d{1,2}/\\d{1,2}/\\d{4}'])
    },
    Items: [],
    Footer: { TotalGeneralDeclare: total }
  }
  if (!out.Header.Devise) {
    let curFound = null
    let mCur = fullText.match(/\b(EUR|USD|MAD|GBP|JPY|XOF|CAD|AUD|CNY|CHF)\b/i)
    if (!mCur) mCur = fullText.match(/\b(EUR|USD|MAD|GBP|JPY|XOF|CAD|AUD|CNY|CHF)\b\s*[0-9]/i)
    if (!mCur) {
      const mAfter = fullText.match(/\d[\d\s.,]*\s*(EUR|USD|MAD|GBP|JPY|XOF|CAD|AUD|CNY|CHF)\b/i)
      if (mAfter) curFound = mAfter[1]
    } else {
      curFound = mCur[1]
    }
    if (!curFound && (/\bDHS?\b|DIRHAM/i.test(fullText))) curFound = 'MAD'
    if (curFound) out.Header.Devise = String(curFound).toUpperCase()
  }
  if (/:20:/.test(fullText) || /MT103/i.test(fullText) || /MT202/i.test(fullText)) {
    const m32 = fullText.match(/:32A:\s*(\d{6})([A-Z]{3})\s*([0-9][0-9.,\s]*)/i)
    const m33 = fullText.match(/:33B:\s*([A-Z]{3})\s*([0-9][0-9.,\s]*)/i)
    const amtStr = (m32 && m32[3]) || (m33 && m33[2]) || ''
    const curStr = (m32 && m32[2]) || (m33 && m33[1]) || ''
    if (amtStr) {
      const s = String(amtStr).replace(/\s/g, '')
      const hasComma = s.includes(',')
      const hasDot = s.includes('.')
      const norm = (() => {
        if (hasComma && hasDot) {
          const lc = s.lastIndexOf(',')
          const ld = s.lastIndexOf('.')
          return lc > ld ? s.replace(/\./g, '').replace(/,/g, '.') : s.replace(/,/g, '')
        }
        if (hasComma && !hasDot) return s.replace(/,/g, '.')
        return s
      })()
      const n = parseFloat(norm)
      if (!isNaN(n)) out.Footer.TotalGeneralDeclare = n
    }
    if (curStr) {
      out.Header.Devise = curStr.toUpperCase()
    }
    const s50 = fullText.match(/:50K:([\s\S]*?)(?=:\d{2}[A-Z]|$)/i)
    if (s50 && s50[1]) {
      const blk = s50[1].split(/\r?\n/).map(x => x.trim()).filter(Boolean)
      out.Header.nom = blk[0] || out.Header.nom
      out.Header.adresse = blk[1] || out.Header.adresse
    }
  }
  for (const line of lines) {
    if (!/total/i.test(line) && /\d+[.,]?\d*/.test(line)) {
      const mlist = line.match(/(\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d+)?)/g)
      if (mlist && mlist.length) {
        const last = mlist[mlist.length - 1]
        const s = String(last).replace(/\s/g, '')
        const hasComma = s.includes(',')
        const hasDot = s.includes('.')
        const norm = (() => {
          if (hasComma && hasDot) {
            const lc = s.lastIndexOf(',')
            const ld = s.lastIndexOf('.')
            return lc > ld ? s.replace(/\./g, '').replace(/,/g, '.') : s.replace(/,/g, '')
          }
          if (hasComma && !hasDot) return s.replace(/,/g, '.')
          return s
        })()
        const montant = parseFloat(norm)
        const qteM = line.match(/^\d+/)
        const qte = qteM ? parseInt(qteM[0]) : 1
        const desc = line.replace(/\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d+)?/g, '').trim()
        out.Items.push({ desc, montant, qte })
      }
    }
  }
  if (!out.Header.Devise) {
    for (const it of out.Items) {
      const mm = String(it.desc || '').match(/\b(EUR|USD|MAD|GBP|JPY|XOF|CAD|AUD|CNY|CHF)\b/i)
      if (mm) { out.Header.Devise = mm[1].toUpperCase(); break }
      if (/\bDHS?\b|DIRHAM/i.test(String(it.desc || ''))) { out.Header.Devise = 'MAD'; break }
    }
  }
  if (!out.Header.Devise) {
    if (/MAD/i.test(fullText) || out.Items.some(it => /MAD/i.test(String(it.desc || '')))) {
      out.Header.Devise = 'MAD'
    }
  }
  let kycScore = 0
  if (out.Header && out.Header.nom) kycScore += 20
  if (out.Header && out.Header.adresse) kycScore += 20
  if (out.Header && out.Header.date) kycScore += 20
  if (out.Footer && typeof out.Footer.TotalGeneralDeclare === 'number' && out.Footer.TotalGeneralDeclare > 0) kycScore += 20
  if (/UBO|propriétaire bénéficiaire/i.test(fullText)) kycScore += 10
  if (/signature|signed/i.test(fullText)) kycScore += 10
  out.KYC = {
    score: kycScore,
    status: kycScore >= 80 ? 'OK - À reviewer' : 'Suspect - Reviewer manuel'
  }
  return out
}
function buildGeminiRequest(segments) {
  const parts = [{ text: 'VENT-EX: Page 1 = Header + Tableau; suivantes = Tableau seul. Retourne STRICTEMENT le JSON unifié. Ignore les lignes qui commencent par "Total".' }]
  for (const seg of segments) {
    if (seg.kind === 'text') {
      parts.push({ text: seg.text })
    } else if (seg.kind === 'image') {
      parts.push({ inline_data: { mime_type: seg.mime, data: seg.b64 } })
    }
  }
  return {
    contents: [ { role: 'user', parts } ],
    generationConfig: { response_mime_type: 'application/json' }
  }
}

function callGemini(payload) {
  const models = [GEMINI_MODEL, 'gemini-2.0-flash-exp']
  const paths = m => [
    `/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    `/v1/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`
  ]
  return new Promise(async (resolve, reject) => {
    for (const m of models) {
      for (const p of paths(m)) {
        try {
          const out = await new Promise((res, rej) => {
            const req = https.request({
              method: 'POST',
              hostname: 'generativelanguage.googleapis.com',
              path: p,
              headers: { 'Content-Type': 'application/json' }
            }, r => {
              let data = ''
              r.on('data', d => { data += d })
              r.on('end', () => {
                if (r.statusCode && r.statusCode >= 200 && r.statusCode < 300) {
                  try {
                    const j = JSON.parse(data)
                    let text = null
                    if (j.candidates && j.candidates[0] && j.candidates[0].content && Array.isArray(j.candidates[0].content.parts)) {
                      const parts = j.candidates[0].content.parts
                      for (const part of parts) {
                        if (typeof part.text === 'string' && part.text.trim()) { text = part.text; break }
                      }
                    }
                    if (!text && typeof j.output_text === 'string') { text = j.output_text }
                    if (!text && j.contents && j.contents[0] && Array.isArray(j.contents[0].parts)) {
                      const parts = j.contents[0].parts
                      for (const part of parts) {
                        if (typeof part.text === 'string' && part.text.trim()) { text = part.text; break }
                      }
                    }
                    if (!text) return rej(new Error('no_content'))
                    let parsed
                    try { parsed = JSON.parse(text) } catch { parsed = text }
                    res(parsed)
                  } catch (e) { rej(e) }
                } else {
                  rej(new Error(`gemini_${r.statusCode}`))
                }
              })
            })
            req.on('error', err => rej(err))
            req.write(JSON.stringify(payload))
            req.end()
          })
          return resolve(out)
        } catch (e) {
          continue
        }
      }
    }
    reject(new Error('gemini_unreachable'))
  })
}

async function handleExtract(body) {
  try { console.log('[extract_env]', { PROVIDER, hasOpenAI: !!OPENAI_API_KEY, hasGemini: !!GEMINI_API_KEY }) } catch {}
  const segments = []
  if (body.url) {
    throw new Error('url_not_supported')
  }
  if (!Array.isArray(body.files) || body.files.length === 0) {
    throw new Error('no_files')
  }
  for (const f of body.files) {
    if (!f || !f.base64) throw new Error('bad_file')
    const t = detectTypeFromBase64(f.base64)
    if (t === 'png' || t === 'jpeg') {
      const mime = t === 'png' ? 'image/png' : 'image/jpeg'
      segments.push({ kind: 'image', b64: f.base64, mime })
      continue
    }
    if (t === 'pdf') {
      const buf = Buffer.from(f.base64, 'base64')
      const text = await tryParsePdfText(buf)
      if (text) {
        segments.push({ kind: 'text', text })
      } else {
        const id = crypto.randomBytes(6).toString('hex')
        const tmp = writeTempFile(`input-${id}`, 'pdf', buf)
        try {
          const pages = await convertPdfToPngs(tmp.file)
          for (const p of pages) segments.push({ kind: 'image', b64: readFileBase64(p), mime: 'image/png' })
        } finally {
          try { fs.rmSync(tmp.dir, { recursive: true, force: true }) } catch {}
        }
      }
      continue
    }
    throw new Error('unsupported_type')
  }
  if (segments.length === 0) throw new Error('no_images')
  let result
  if (PROVIDER === 'ocrspace') {
    if (!OCR_SPACE_KEY) throw new Error('ocrspace_missing_key')
    const textSegs = []
    const ocrPageResults = []
    let pagesDone = 0
    for (const seg of segments) {
      if (pagesDone >= 3) break
      if (seg.kind === 'text') { textSegs.push(seg.text); continue }
      const typeHint = seg.mime === 'image/png' ? 'PNG' : 'JPG'
      const ocr = await callOCRSpace(seg.mime, seg.b64, typeHint)
      ocrPageResults.push(ocr)
      pagesDone++
    }
    const merged = { ParsedResults: [] }
    for (const r of ocrPageResults) {
      if (r && Array.isArray(r.ParsedResults)) merged.ParsedResults = merged.ParsedResults.concat(r.ParsedResults)
    }
    result = buildVentilationFromOCR(merged, textSegs)
    return result
  }
  if (PROVIDER === 'grok') {
    if (!GROK_API_KEY) throw new Error('grok_missing_key')
    const payload = buildGrokRequest(segments)
    result = await callGrok(payload)
    return result
  }
  if (PROVIDER === 'gemini') {
    if (!GEMINI_API_KEY) throw new Error('gemini_missing_key')
    const payload = buildGeminiRequest(segments)
    result = await callGemini(payload)
  } else {
    if (!OPENAI_API_KEY) throw new Error('openai_missing_key')
    const payload = buildOpenAIRequest(segments)
    result = await callOpenAI(payload)
  }
  return result
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url || '')
  if (req.method === 'POST' && parsed.pathname === '/ventilation/extract') {
    try {
      const body = await parseJSONBody(req)
      const out = await handleExtract(body)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(typeof out === 'string' ? out : JSON.stringify(out))
    } catch (e) {
      try { console.error('[extract_error]', e && e.message ? e.message : e) } catch {}
      let code = 400
      let msg = 'error'
      if (e && e.message === 'pdftoppm_not_available') { code = 500; msg = 'pdftoppm missing' }
      else if (e && e.message) { msg = e.message }
      res.writeHead(code, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: msg }))
    }
    return
  }
  if (req.method === 'GET' && parsed.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
    return
  }
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'not_found' }))
})

server.listen(PORT, () => {})

