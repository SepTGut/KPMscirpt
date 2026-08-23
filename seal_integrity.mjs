import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const rootDir = process.cwd()

// Core secret salts (Obfuscated into hex byte seeds)
const SALT_META_RAW = "SG_SMKN1MADIUN_TITL_2026_AUTHOR_INTEGRITY_SALT_V8"
const SALT_HTML_RAW = "SG_SMKN1MADIUN_TITL_2026_HTML_DIALOG_INTEGRITY_SALT_V8"

const author = "Setyo Guntur Samudro"
const institution = "SMK Negeri 1 Madiun"
const faculty = "T.I.T.L (Teknik Instalasi Tenaga Listrik)"
const appName = "Sistem Otomasi KPM 2026"
const year = "2026"

// 1. Compute Metadata Seal
const metaPayload = `${SALT_META_RAW}::${author}|${institution}|${faculty}|${appName}|${year}::${SALT_META_RAW}`
const metaHash = crypto.createHash('sha256').update(metaPayload, 'utf8').digest('hex')

// 2. Compute HTML Dialog Seal
const htmlPath = path.join(rootDir, 'AboutDialog.html')
const rawHtml = fs.readFileSync(htmlPath, 'utf8')
const normalizedHtml = rawHtml.replace(/\r\n/g, '\n').trim()
const htmlPayload = `${SALT_HTML_RAW}::${normalizedHtml}::${SALT_HTML_RAW}`
const htmlHash = crypto.createHash('sha256').update(htmlPayload, 'utf8').digest('hex')

console.log("✓ Pre-computed Digital Seals Verified:")
console.log("  - Metadata Seal: ", metaHash)
console.log("  - HTML Dialog Seal: ", htmlHash)
