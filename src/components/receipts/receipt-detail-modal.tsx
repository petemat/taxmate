'use client'

import { Receipt } from '@/types/database'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download, Eye, FileText, Receipt as ReceiptIcon, X, Building, Calendar, Euro } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Nicht verfügbar'
  return new Date(dateString).toLocaleDateString('de-DE')
}
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface ReceiptDetailModalProps {
  receipt: Receipt | null
  isOpen: boolean
  onClose: () => void
}

export function ReceiptDetailModal({ receipt, isOpen, onClose }: ReceiptDetailModalProps) {
  const [imageError, setImageError] = useState(false)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (receipt?.source_file_url && isOpen) {
      setSignedUrl(null) // Reset state
      setImageError(false) // Reset error state
      setLoading(true) // Set loading immediately
      generateSignedUrl()
    } else if (!isOpen) {
      // Reset all states when modal closes
      setSignedUrl(null)
      setImageError(false)
      setLoading(false)
    }
  }, [receipt?.source_file_url, isOpen])

  const generateSignedUrl = async () => {
    if (!receipt?.source_file_url) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      // Extract the file path from the URL
      const url = new URL(receipt.source_file_url)
      const pathParts = url.pathname.split('/')
      const bucketIndex = pathParts.findIndex(part => part === 'receipts')
      
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        const filePath = pathParts.slice(bucketIndex + 1).join('/')
        
        const { data, error } = await supabase.storage
          .from('receipts')
          .createSignedUrl(filePath, 3600) // 1 hour expiry
        
        if (error) {
          console.error('Error creating signed URL:', error)
          setSignedUrl(receipt.source_file_url) // Fallback to original URL
        } else {
          setSignedUrl(data.signedUrl)
        }
      } else {
        setSignedUrl(receipt.source_file_url) // Fallback to original URL
      }
    } catch (error) {
      console.error('Error generating signed URL:', error)
      setSignedUrl(receipt.source_file_url) // Fallback to original URL
    }
    
    // Always ensure loading is set to false
    setTimeout(() => setLoading(false), 100)
  }

  if (!receipt) return null

  const isImage = receipt.source_file_url?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)/)
  const isPDF = receipt.source_file_url?.toLowerCase().includes('.pdf')

  const handleDownload = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank')
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800'
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const overallConfidence = (receipt.confidence as any)?.overall || 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-6xl max-h-[90vh] overflow-y-auto"
        aria-describedby="receipt-details-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptIcon className="h-5 w-5" />
            Beleg Details
          </DialogTitle>
        </DialogHeader>
        <div id="receipt-details-description" className="sr-only">
          Detailansicht für Beleg mit Dokumentvorschau und Finanzinformationen
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Document Preview */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Dokument
                  </span>
                  {receipt.source_file_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownload}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
                    <p className="text-sm text-gray-500">Dokument wird geladen...</p>
                  </div>
                ) : signedUrl ? (
                  <div className="space-y-4">
                    {isImage && !imageError ? (
                      <div className="flex justify-center">
                        <img
                          src={signedUrl}
                          alt="Receipt document"
                          className="w-full h-auto max-h-[600px] object-contain rounded-lg border cursor-zoom-in"
                          onError={() => setImageError(true)}
                          onClick={() => window.open(signedUrl, '_blank')}
                        />
                      </div>
                    ) : isPDF ? (
                      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                        <FileText className="h-16 w-16 text-gray-400 mb-4" />
                        <p className="text-sm text-gray-500 mb-4">PDF Dokument</p>
                        <Button onClick={handleDownload} variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          PDF öffnen
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                        <FileText className="h-16 w-16 text-gray-400 mb-4" />
                        <p className="text-sm text-gray-500">Dokument nicht verfügbar</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <X className="h-16 w-16 text-gray-400 mb-4" />
                    <p className="text-sm text-gray-500">Kein Dokument verfügbar</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Receipt Information */}
          <div className="space-y-4">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Beleg Informationen
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={receipt.type === 'expense' ? 'destructive' : 'default'}
                    >
                      {receipt.type === 'expense' ? 'Ausgabe' : 'Einnahme'}
                    </Badge>
                    {receipt.needs_review && (
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        Prüfung erforderlich
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Anbieter</p>
                      <p className="text-sm text-muted-foreground">
                        {receipt.vendor || 'Nicht verfügbar'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Datum</p>
                      <p className="text-sm text-muted-foreground">
                        {receipt.date ? formatDate(receipt.date) : 'Nicht verfügbar'}
                      </p>
                    </div>
                  </div>
                </div>

                {receipt.description && (
                  <div>
                    <p className="text-sm font-medium mb-1">Beschreibung</p>
                    <p className="text-sm text-muted-foreground">{receipt.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-4 w-4" />
                  Finanzielle Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Nettobetrag</p>
                    <p className="text-lg font-semibold">
                      {receipt.net_amount ? formatCurrency(receipt.net_amount) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">MwSt.</p>
                    <p className="text-lg font-semibold">
                      {receipt.vat_amount ? formatCurrency(receipt.vat_amount) : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium">Bruttobetrag</p>
                  <p className="text-xl font-bold text-primary">
                    {receipt.gross_amount ? formatCurrency(receipt.gross_amount) : 'N/A'}
                  </p>
                </div>
                {receipt.vat_rate && (
                  <div className="text-sm text-muted-foreground">
                    MwSt.-Satz: {receipt.vat_rate}%
                  </div>
                )}
              </CardContent>
            </Card>

            {/* OCR Confidence */}
            <Card>
              <CardHeader>
                <CardTitle>KI-Extraktion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Vertrauen</span>
                  <Badge className={getConfidenceColor(overallConfidence)}>
                    {Math.round(overallConfidence * 100)}%
                  </Badge>
                </div>
                {receipt.ocr_provider && (
                  <div className="text-sm text-muted-foreground">
                    Anbieter: {receipt.ocr_provider}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Erstellt: {formatDate(receipt.created_at)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
