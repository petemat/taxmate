export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ReceiptType = 'income' | 'expense'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      receipts: {
        Row: {
          id: string
          user_id: string
          type: ReceiptType
          vendor: string | null
          description: string | null
          date: string | null
          gross_amount: number | null
          net_amount: number | null
          vat_amount: number | null
          vat_rate: number | null
          currency: string
          source_file_url: string | null
          ocr_provider: string | null
          raw_ocr_json: Json | null
          confidence: Json | null
          needs_review: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type?: ReceiptType
          vendor?: string | null
          description?: string | null
          date?: string | null
          gross_amount?: number | null
          net_amount?: number | null
          vat_amount?: number | null
          vat_rate?: number | null
          currency?: string
          source_file_url?: string | null
          ocr_provider?: string | null
          raw_ocr_json?: Json | null
          confidence?: Json | null
          needs_review?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: ReceiptType
          vendor?: string | null
          description?: string | null
          date?: string | null
          gross_amount?: number | null
          net_amount?: number | null
          vat_amount?: number | null
          vat_rate?: number | null
          currency?: string
          source_file_url?: string | null
          ocr_provider?: string | null
          raw_ocr_json?: Json | null
          confidence?: Json | null
          needs_review?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      receipt_audit_log: {
        Row: {
          id: string
          receipt_id: string
          user_id: string
          field_name: string
          old_value: string | null
          new_value: string | null
          change_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          receipt_id: string
          user_id: string
          field_name: string
          old_value?: string | null
          new_value?: string | null
          change_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          receipt_id?: string
          user_id?: string
          field_name?: string
          old_value?: string | null
          new_value?: string | null
          change_reason?: string | null
          created_at?: string
        }
      }
      failed_extractions: {
        Row: {
          id: string
          user_id: string
          file_url: string
          error_message: string | null
          retry_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_url: string
          error_message?: string | null
          retry_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_url?: string
          error_message?: string | null
          retry_count?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      receipt_summaries: {
        Row: {
          user_id: string
          type: ReceiptType
          count: number
          total_gross: number | null
          total_net: number | null
          total_vat: number | null
          month: string
        }
      }
    }
    Functions: {
      calculate_vat_amounts: {
        Args: {
          gross_amount: number | null
          net_amount: number | null
          vat_rate: number | null
        }
        Returns: {
          calculated_gross: number
          calculated_net: number
          calculated_vat: number
          calculated_rate: number
        }[]
      }
    }
    Enums: {
      receipt_type: ReceiptType
    }
  }
}

// Application-specific types
export interface ReceiptConfidence {
  vendor?: number
  description?: number
  date?: number
  gross_amount?: number
  net_amount?: number
  vat_amount?: number
  vat_rate?: number
  overall?: number
}

export interface ReceiptFormData {
  type: ReceiptType
  vendor: string
  description: string
  date: string
  gross_amount: number
  net_amount: number
  vat_amount: number
  vat_rate: number
  currency: string
}

export interface ReceiptSummary {
  totalIncome: number
  totalExpenses: number
  totalNet: number
  totalVat: number
  count: number
}

export interface OCRResult {
  vendor?: string
  description?: string
  date?: string
  gross_amount?: number
  net_amount?: number
  vat_amount?: number
  vat_rate?: number
  confidence: ReceiptConfidence
  raw_data?: Json
}

// German VAT rates
export const GERMAN_VAT_RATES = [
  { value: 19, label: '19% (Regelsteuersatz)' },
  { value: 7, label: '7% (Ermäßigter Satz)' },
  { value: 0, label: '0% (Steuerbefreit)' }
] as const

export type GermanVATRate = typeof GERMAN_VAT_RATES[number]['value']

// Convenience type alias
export type Receipt = Database['public']['Tables']['receipts']['Row']
