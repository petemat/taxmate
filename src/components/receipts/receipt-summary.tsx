'use client'

import { useMemo } from 'react'
import { Database } from '@/types/database'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Calculator, FileText } from 'lucide-react'

type Receipt = Database['public']['Tables']['receipts']['Row']

interface ReceiptSummaryProps {
  receipts: Receipt[]
}

export function ReceiptSummary({ receipts }: ReceiptSummaryProps) {
  const summary = useMemo(() => {
    const validReceipts = receipts.filter(r => r.gross_amount !== null)
    
    const totalIncome = validReceipts
      .filter(r => r.type === 'income')
      .reduce((sum, r) => sum + (r.gross_amount || 0), 0)
    
    const totalExpenses = validReceipts
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + (r.gross_amount || 0), 0)
    
    const totalNet = validReceipts
      .reduce((sum, r) => sum + (r.net_amount || 0), 0)
    
    const totalVat = validReceipts
      .reduce((sum, r) => sum + (r.vat_amount || 0), 0)
    
    const needsReview = receipts.filter(r => r.needs_review).length
    
    return {
      totalIncome,
      totalExpenses,
      totalNet,
      totalVat,
      balance: totalIncome - totalExpenses,
      count: receipts.length,
      needsReview,
    }
  }, [receipts])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Einnahmen (brutto)
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold text-gray-900">
            {formatCurrency(summary.totalIncome)}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Ausgaben (brutto)
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold text-gray-900">
            {formatCurrency(summary.totalExpenses)}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Saldo
          </CardTitle>
          <Calculator className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-semibold ${
            summary.balance >= 0 ? 'text-gray-900' : 'text-red-600'
          }`}>
            {formatCurrency(summary.balance)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Einnahmen - Ausgaben
          </p>
        </CardContent>
      </Card>

      <Card className="border border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Belege gesamt
          </CardTitle>
          <FileText className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold text-gray-900">
            {summary.count}
          </div>
          {summary.needsReview > 0 && (
            <p className="text-xs text-amber-600 mt-1">
              {summary.needsReview} benötigen Überprüfung
            </p>
          )}
        </CardContent>
      </Card>

      {/* Additional summary row for VAT details */}
      <Card className="md:col-span-2 border border-gray-200">
        <CardHeader>
          <CardTitle className="text-base font-medium text-gray-900">
            Mehrwertsteuer-Übersicht
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Netto gesamt</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(summary.totalNet)}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">MwSt. gesamt</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(summary.totalVat)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick actions card */}
      <Card className="md:col-span-2 border border-gray-200">
        <CardHeader>
          <CardTitle className="text-base font-medium text-gray-900">
            Schnellaktionen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-md transition-colors duration-150">
              CSV Export
            </button>
            <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-md transition-colors duration-150">
              Monatsübersicht
            </button>
            <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-md transition-colors duration-150">
              Steuerberatung vorbereiten
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
