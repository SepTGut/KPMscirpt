import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// Core secret salts (Obfuscated into hex byte seeds)
const SALT_META_RAW = "SG_SMKN1MADIUN_TITL_2026_AUTHOR_INTEGRITY_SALT_V8"

const author = "Setyo Guntur Samudro"
const institution = "SMK Negeri 1 Madiun"
const faculty = "T.I.T.L (Teknik Instalasi Tenaga Listrik)"
const appName = "Sistem Otomasi KPM 2026"
const year = "2026"

function normalizeText(str) {
  return String(str || '').trim().replace(/\s+/g, ' ')
}

// 1. Compute Metadata Seal
const metaPayload = `${SALT_META_RAW}::${normalizeText(author)}|${normalizeText(institution)}|${normalizeText(faculty)}|${normalizeText(appName)}|${normalizeText(year)}::${SALT_META_RAW}`
const metaHash = crypto.createHash('sha256').update(metaPayload, 'utf8').digest('hex')

console.log("=== DETERMINISTIC DIGITAL SEALS ===")
console.log("META SEAL: ", metaHash)

// Update About.gs automatically with the exact hash
const aboutGsPath = path.join(rootDir, 'gas', 'About.gs')
let aboutGsContent = fs.readFileSync(aboutGsPath, 'utf8')

aboutGsContent = aboutGsContent.replace(
  /EXPECTED_META_SEAL:\s*"[^"]*"/,
  `EXPECTED_META_SEAL: "${metaHash}"`
)

fs.writeFileSync(aboutGsPath, aboutGsContent, 'utf8')
console.log("✓ Successfully synchronized About.gs with deterministic digital seal.")
