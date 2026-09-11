import { describe, it, expect } from 'vitest'
import { sanitizeSpreadsheetInput } from '../src/stores/kpm'

describe('Spreadsheet Formula Injection Defense (sanitizeSpreadsheetInput)', () => {
  it('prepends single quote to strings starting with =', () => {
    expect(sanitizeSpreadsheetInput('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)")
    expect(sanitizeSpreadsheetInput('=IMPORTRANGE("url", "sheet")')).toBe("'=IMPORTRANGE(\"url\", \"sheet\")")
  })

  it('prepends single quote to strings starting with + or -', () => {
    expect(sanitizeSpreadsheetInput('+12345')).toBe("'+12345")
    expect(sanitizeSpreadsheetInput('-CMD()')).toBe("'-CMD()")
  })

  it('prepends single quote to strings starting with @, tab, or carriage return', () => {
    expect(sanitizeSpreadsheetInput('@SUM(1,2)')).toBe("'@SUM(1,2)")
    expect(sanitizeSpreadsheetInput('\tMaliciousTab')).toBe("'\tMaliciousTab")
    expect(sanitizeSpreadsheetInput('\rMaliciousCR')).toBe("'\rMaliciousCR")
  })

  it('neutralizes fullwidth equals signs (＝ U+FF1D)', () => {
    expect(sanitizeSpreadsheetInput('＝SUM(1,2)')).toBe("'＝SUM(1,2)")
  })

  it('leaves safe strings untouched', () => {
    expect(sanitizeSpreadsheetInput('Baut M10x50')).toBe('Baut M10x50')
    expect(sanitizeSpreadsheetInput('KPM-2026-001')).toBe('KPM-2026-001')
    expect(sanitizeSpreadsheetInput('Workshop Candi Sewu')).toBe('Workshop Candi Sewu')
    expect(sanitizeSpreadsheetInput('')).toBe('')
  })

  it('passes through non-string types safely', () => {
    expect(sanitizeSpreadsheetInput(123)).toBe(123)
    expect(sanitizeSpreadsheetInput(null)).toBe(null)
    expect(sanitizeSpreadsheetInput(undefined)).toBe(undefined)
    expect(sanitizeSpreadsheetInput(true)).toBe(true)
  })
})
