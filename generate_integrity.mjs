import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const rootDir = process.cwd()

// Secret salts
const METADATA_SALT = "KPM_SIG_SALT_v8_SG_SMKN1MADIUN_TITL_2026"
const HTML_SALT = "KPM_HTML_SALT_v8_ABOUT_DIALOG_SECURE_TOKEN_2026"

// 1. Compute Metadata Hash
const author = "Setyo Guntur Samudro"
const institution = "SMK Negeri 1 Madiun"
const faculty = "T.I.T.L (Teknik Instalasi Tenaga Listrik)"
const appName = "Sistem Otomasi KPM 2026"
const year = "2026"

const metadataPayload = `${METADATA_SALT}::${author}|${institution}|${faculty}|${appName}|${year}::${METADATA_SALT}`
const metadataHash = crypto.createHash('sha256').update(metadataPayload, 'utf8').digest('hex')

// 2. Compute AboutDialog.html Hash
const htmlPath = path.join(rootDir, 'AboutDialog.html')
const rawHtml = fs.readFileSync(htmlPath, 'utf8')
const normalizedHtml = rawHtml.replace(/\r\n/g, '\n').trim()
const htmlPayload = `${HTML_SALT}::${normalizedHtml}::${HTML_SALT}`
const htmlHash = crypto.createHash('sha256').update(htmlPayload, 'utf8').digest('hex')

console.log("=== INTEGRITY HASH RESULTS ===")
console.log("METADATA_HASH:", metadataHash)
console.log("HTML_HASH:    ", htmlHash)
