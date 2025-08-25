'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Database, GERMAN_VAT_RATES } from '@/types/database'
import { calculateVATAmounts } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Save, X, Calculator, AlertTriangle } from 'lucide-react'

type Receipt = Database['public']['Tables']['receipts']['Row']

const receiptSchema = z.object({
  type: z.enum(['income', 'expense']),
  vendor: z.string().min(1, 'Dienstleister ist erforderlich'),
  description: z.string().min(1, 'Beschreibung ist erforderlich'),
  date: z.string().min(1, 'Datum ist erforderlich'),
  gross_amount: z.number().min(0, 'Bruttobetrag muss positiv sein'),
  net_amount: z.number().min(0, 'Nettobetrag muss positiv sein'),
  vat_amount: z.number().min(0, 'MwSt.-Betrag muss positiv sein'),
  vat_rate: z.number().min(0).max(100, 'MwSt.-Satz muss zwischen 0 und 100% liegen'),
  currency: z.string().optional().default('EUR'),
})

type ReceiptFormData = z.infer<typeof receiptSchema>

interface ReceiptEditFormProps {
  receipt: Receipt
  onSave: () => void
  onCancel: () => void
}

export function ReceiptEditForm({ receipt, onSave, onCancel }: ReceiptEditFormProps) {
  const [saving, setSaving] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      type: receipt.type,
      vendor: receipt.vendor || '',
      description: receipt.description || '',
      date: receipt.date || new Date().toISOString().split('T')[0],
      gross_amount: receipt.gross_amount || 0,
      net_amount: receipt.net_amount || 0,
      vat_amount: receipt.vat_amount || 0,
      vat_rate: receipt.vat_rate || 19,
      currency: receipt.currency || 'EUR',
    },
  })

  const watchedValues = watch()

  // Auto-calculate VAT amounts when values change
  useEffect(() => {
    const { gross_amount, net_amount, vat_rate } = watchedValues
    
    if (calculating) return // Prevent infinite loops
    
    const result = calculateVATAmounts({
      grossAmount: gross_amount,
      netAmount: net_amount,
      vatRate: vat_rate,
    })

    if (result) {
      setCalculating(true)
      setValue('gross_amount', result.gross, { shouldDirty: true })
      setValue('net_amount', result.net, { shouldDirty: true })
      setValue('vat_amount', result.vat, { shouldDirty: true })
      setValue('vat_rate', result.rate, { shouldDirty: true })
      setTimeout(() => setCalculating(false), 100)
    }
  }, [watchedValues.gross_amount, watchedValues.net_amount, watchedValues.vat_rate, setValue, calculating])

  const onSubmit = async (data: ReceiptFormData) => {
    setSaving(true)

    try {
      const { error } = await supabase
        .from('receipts')
        .update({
          type: data.type,
          vendor: data.vendor,
          description: data.description,
          date: data.date,
          gross_amount: data.gross_amount,
          net_amount: data.net_amount,
          vat_amount: data.vat_amount,
          vat_rate: data.vat_rate,
          currency: data.currency,
          needs_review: false, // Mark as reviewed after manual edit
          updated_at: new Date().toISOString(),
        })
        .eq('id', receipt.id)

      if (error) {
        throw error
      }

      toast({
        title: 'Beleg gespeichert',
        description: 'Die Änderungen wurden erfolgreich gespeichert.',
      })

      onSave()
    } catch (error) {
      console.error('Error saving receipt:', error)
      toast({
        title: 'Fehler beim Speichern',
        description: 'Die Änderungen konnten nicht gespeichert werden.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const confidence = receipt.confidence as any
  const needsReview = receipt.needs_review

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <span>Beleg bearbeiten</span>
            {needsReview && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <AlertTriangle className="h-3 w-3" />
                <span>Überprüfung erforderlich</span>
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Typ</label>
            <div className="flex space-x-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="expense"
                  {...register('type')}
                  className="radio"
                />
                <span>Ausgabe</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="income"
                  {...register('type')}
                  className="radio"
                />
                <span>Einnahme</span>
              </label>
            </div>
          </div>

          {/* Vendor */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Dienstleister
              {confidence?.vendor && (
                <span className="ml-2 text-xs text-muted-foreground">
                  Konfidenz: {Math.round(confidence.vendor * 100)}%
                </span>
              )}
            </label>
            <Input
              {...register('vendor')}
              placeholder="Name des Anbieters"
              className={confidence?.vendor && confidence.vendor < 0.85 ? 'border-yellow-500' : ''}
            />
            {errors.vendor && (
              <p className="text-sm text-red-600">{errors.vendor.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Beschreibung
              {confidence?.description && (
                <span className="ml-2 text-xs text-muted-foreground">
                  Konfidenz: {Math.round(confidence.description * 100)}%
                </span>
              )}
            </label>
            <Input
              {...register('description')}
              placeholder="Beschreibung der Leistung/Produkte"
              className={confidence?.description && confidence.description < 0.85 ? 'border-yellow-500' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Datum
              {confidence?.date && (
                <span className="ml-2 text-xs text-muted-foreground">
                  Konfidenz: {Math.round(confidence.date * 100)}%
                </span>
              )}
            </label>
            <Input
              type="date"
              {...register('date')}
              className={confidence?.date && confidence.date < 0.85 ? 'border-yellow-500' : ''}
            />
            {errors.date && (
              <p className="text-sm text-red-600">{errors.date.message}</p>
            )}
          </div>

          {/* Financial Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Bruttobetrag (€)
                {confidence?.gross_amount && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    Konfidenz: {Math.round(confidence.gross_amount * 100)}%
                  </span>
                )}
              </label>
              <Input
                type="number"
                step="0.01"
                {...register('gross_amount', { valueAsNumber: true })}
                className={confidence?.gross_amount && confidence.gross_amount < 0.85 ? 'border-yellow-500' : ''}
              />
              {errors.gross_amount && (
                <p className="text-sm text-red-600">{errors.gross_amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nettobetrag (€)
                {confidence?.net_amount && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    Konfidenz: {Math.round(confidence.net_amount * 100)}%
                  </span>
                )}
              </label>
              <Input
                type="number"
                step="0.01"
                {...register('net_amount', { valueAsNumber: true })}
                className={confidence?.net_amount && confidence.net_amount < 0.85 ? 'border-yellow-500' : ''}
              />
              {errors.net_amount && (
                <p className="text-sm text-red-600">{errors.net_amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                MwSt.-Betrag (€)
                {confidence?.vat_amount && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    Konfidenz: {Math.round(confidence.vat_amount * 100)}%
                  </span>
                )}
              </label>
              <Input
                type="number"
                step="0.01"
                {...register('vat_amount', { valueAsNumber: true })}
                className={confidence?.vat_amount && confidence.vat_amount < 0.85 ? 'border-yellow-500' : ''}
              />
              {errors.vat_amount && (
                <p className="text-sm text-red-600">{errors.vat_amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                MwSt.-Satz (%)
                {confidence?.vat_rate && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    Konfidenz: {Math.round(confidence.vat_rate * 100)}%
                  </span>
                )}
              </label>
              <select
                {...register('vat_rate', { valueAsNumber: true })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {GERMAN_VAT_RATES.map((rate) => (
                  <option key={rate.value} value={rate.value}>
                    {rate.label}
                  </option>
                ))}
              </select>
              {errors.vat_rate && (
                <p className="text-sm text-red-600">{errors.vat_rate.message}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const result = calculateVATAmounts({
                  grossAmount: watchedValues.gross_amount,
                  netAmount: watchedValues.net_amount,
                  vatRate: watchedValues.vat_rate,
                })
                if (result) {
                  setValue('gross_amount', result.gross, { shouldDirty: true })
                  setValue('net_amount', result.net, { shouldDirty: true })
                  setValue('vat_amount', result.vat, { shouldDirty: true })
                  setValue('vat_rate', result.rate, { shouldDirty: true })
                }
              }}
            >
              <Calculator className="mr-2 h-4 w-4" />
              Neu berechnen
            </Button>

            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={saving || !isDirty}>
                {saving ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Speichern...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Speichern
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
