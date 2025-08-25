import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency for German locale
export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(amount)
}

// Format date for German locale
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('de-DE').format(dateObj)
}

// Calculate VAT amounts based on German tax logic
export function calculateVATAmounts(params: {
  grossAmount?: number
  netAmount?: number
  vatRate?: number
}) {
  const { grossAmount, netAmount, vatRate } = params

  // If we have gross and rate, calculate net and vat
  if (grossAmount && vatRate !== undefined) {
    const calculatedNet = Math.round((grossAmount / (1 + vatRate / 100)) * 100) / 100
    const calculatedVat = Math.round((grossAmount - calculatedNet) * 100) / 100
    return {
      gross: grossAmount,
      net: calculatedNet,
      vat: calculatedVat,
      rate: vatRate,
    }
  }

  // If we have net and rate, calculate gross and vat
  if (netAmount && vatRate !== undefined) {
    const calculatedGross = Math.round((netAmount * (1 + vatRate / 100)) * 100) / 100
    const calculatedVat = Math.round((calculatedGross - netAmount) * 100) / 100
    return {
      gross: calculatedGross,
      net: netAmount,
      vat: calculatedVat,
      rate: vatRate,
    }
  }

  // If we have gross and net, calculate vat and rate
  if (grossAmount && netAmount) {
    const calculatedVat = Math.round((grossAmount - netAmount) * 100) / 100
    const calculatedRate = netAmount > 0 
      ? Math.round(((grossAmount - netAmount) / netAmount) * 100 * 100) / 100
      : 0
    return {
      gross: grossAmount,
      net: netAmount,
      vat: calculatedVat,
      rate: calculatedRate,
    }
  }

  return null
}

// Validate German VAT rates
export function isValidGermanVATRate(rate: number): boolean {
  const validRates = [0, 7, 19]
  return validRates.includes(rate)
}

// File size formatter
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Generate file path for storage
export function generateStoragePath(userId: string, fileName: string): string {
  const timestamp = Date.now()
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `${userId}/${timestamp}_${sanitizedFileName}`
}
