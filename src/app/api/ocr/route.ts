import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import OpenAI from 'openai'
import { createRequire } from 'module'

// Ensure Node.js runtime (required for pdf-parse and Buffer)
export const runtime = 'nodejs'

// Typed shapes for extracted data and confidence
type OCRExtractedData = {
  vendor: string
  description: string
  date: string // YYYY-MM-DD
  gross_amount: number
  net_amount: number
  vat_amount: number
  vat_rate: number
  type: string
  currency: string
}

type OCRConfidence = {
  overall: number
  vendor: number
  amount: number
  date: number
}

type VisionContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

type VisionUserMessage = {
  role: 'user'
  content: VisionContentBlock[]
}

export async function POST(request: NextRequest) {
  console.log('=== OCR API CALLED ===')
  
  try {
    const body = await request.json()
    console.log('Request body received:', body)
    
    const { receiptId } = body
    
    if (!receiptId) {
      return NextResponse.json(
        { error: 'Receipt ID is required' },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    })

    console.log('Fetching receipt from database...')
    
    // Fetch receipt from database
    const { data: receipt, error: fetchError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .single()

    if (fetchError || !receipt) {
      console.error('Receipt fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      )
    }

    console.log('Receipt found:', receipt.id, 'File URL:', receipt.source_file_url)

    if (!receipt.source_file_url) {
      return NextResponse.json(
        { error: 'No file URL found for receipt' },
        { status: 400 }
      )
    }

    // Extract file path from URL
    const url = new URL(receipt.source_file_url)
    const filePath = url.pathname.replace('/storage/v1/object/public/receipts/', '')
    console.log('Extracted file path:', filePath)

    // Check if file is PDF
    const fileUrl = receipt.source_file_url
    const isPDF = fileUrl?.toLowerCase().includes('.pdf')
    console.log('File type detected:', isPDF ? 'PDF' : 'Image')

    let extractedData: OCRExtractedData | null = null
    let confidence: OCRConfidence = { overall: 0.5, vendor: 0.5, amount: 0.5, date: 0.5 }
    let needsReview = true

    if (isPDF) {
      // For PDFs, extract text and process with GPT-4o (proven working method from memory)
      console.log('PDF detected - extracting text and processing with GPT-4o')
      
      try {
        // Download PDF content using Supabase signed URL for secure access
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('receipts')
          .createSignedUrl(filePath, 3600) // 1 hour expiry

        if (signedUrlError || !signedUrlData) {
          console.error('Error creating signed URL for PDF:', signedUrlError)
          throw new Error('Failed to create signed URL for PDF')
        }

        const pdfSignedUrl = signedUrlData.signedUrl
        console.log('Using signed URL for PDF download:', pdfSignedUrl)
        
        const pdfResponse = await fetch(pdfSignedUrl)
        if (!pdfResponse.ok) {
          console.error('PDF download failed:', pdfResponse.status, pdfResponse.statusText)
          throw new Error(`Failed to download PDF: ${pdfResponse.status} ${pdfResponse.statusText}`)
        }
        
        const pdfBuffer = await pdfResponse.arrayBuffer()
        console.log('PDF downloaded successfully, size:', pdfBuffer.byteLength)
        
        // Use simple approach: try pdf-parse with proper error handling
        try {
          // Load pdf-parse at runtime via Node's createRequire to avoid bundling tests/fixtures
          const require = createRequire(import.meta.url)
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
          const pdfData = await pdfParse(Buffer.from(pdfBuffer))
          const extractedText = pdfData.text
          console.log('PDF text extracted, length:', extractedText.length)
          console.log('First 200 chars:', extractedText.substring(0, 200) + '...')
          
          if (!extractedText || extractedText.trim().length === 0) {
            throw new Error('No text could be extracted from PDF')
          }
          
          // Process extracted text with GPT-4o
          console.log('Analyzing extracted text with GPT-4o...')
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: `Analysiere diesen deutschen Rechnungstext und extrahiere folgende Informationen im JSON Format:

{
  "vendor": "Firmenname",
  "description": "Kurze Beschreibung der Waren/Dienstleistungen",
  "date": "YYYY-MM-DD",
  "gross_amount": 0.00,
  "net_amount": 0.00,
  "vat_amount": 0.00,
  "vat_rate": 19,
  "type": "expense",
  "currency": "EUR"
}

Gib nur gültiges JSON zurück, keine zusätzlichen Erklärungen.

Text zu analysieren:
${extractedText}`
              }
            ],
            max_tokens: 1000
          })

          const content = response.choices[0]?.message?.content
          console.log('GPT-4o response:', content)

          if (content) {
            // Clean response and extract JSON
            let cleanContent = content.trim()
            if (cleanContent.startsWith('```json')) {
              cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '')
            } else if (cleanContent.startsWith('```')) {
              cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
            }
            
            // Try to extract JSON from response
            const jsonMatch = cleanContent.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              extractedData = JSON.parse(jsonMatch[0]) as OCRExtractedData
              confidence = {
                overall: 0.85,
                vendor: 0.85,
                amount: 0.85,
                date: 0.85
              }
              needsReview = false
              console.log('SUCCESS: PDF text processed with GPT-4o:', extractedData)
            } else {
              throw new Error('No JSON found in GPT-4o response')
            }
          } else {
            throw new Error('Empty response from GPT-4o')
          }
        } catch (textExtractionError) {
          console.error('Text extraction failed:', textExtractionError)
          throw textExtractionError
        }

      } catch (pdfError) {
        console.error('PDF processing error:', pdfError)
        console.log('PDF processing failed, using fallback data')
        
        // Fallback data for failed PDF processing
        extractedData = {
          vendor: 'PDF Processing Failed',
          description: 'Please review and edit manually',
          date: new Date().toISOString().split('T')[0],
          gross_amount: 0,
          net_amount: 0,
          vat_amount: 0,
          vat_rate: 19,
          type: 'expense',
          currency: 'EUR'
        }
        confidence = {
          overall: 0.3,
          vendor: 0.3,
          amount: 0.3,
          date: 0.3
        }
        needsReview = true
      }
    } else {
      // For images, create signed URL and use OpenAI Vision API
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('receipts')
        .createSignedUrl(filePath, 3600) // 1 hour expiry

      if (signedUrlError || !signedUrlData) {
        console.error('Error creating signed URL:', signedUrlError)
        throw new Error('Failed to create signed URL for image')
      }
      
      const imageUrl = signedUrlData.signedUrl
      console.log('Using signed URL for OpenAI:', imageUrl)

      // For images, use OpenAI Vision API
      const messages: VisionUserMessage[] = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analysiere diese deutsche Rechnung und extrahiere folgende Informationen im JSON Format:

{
  "vendor": "Firmenname",
  "description": "Kurze Beschreibung der Waren/Dienstleistungen",
  "date": "YYYY-MM-DD",
  "gross_amount": 0.00,
  "net_amount": 0.00,
  "vat_amount": 0.00,
  "vat_rate": 19,
  "type": "expense",
  "currency": "EUR"
}

Gib nur gültiges JSON zurück, keine zusätzlichen Erklärungen.`
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ]

      console.log('Sending request to OpenAI GPT-4o (Vision)...')
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        max_tokens: 1000
      })

      const content = response.choices[0]?.message?.content
      console.log('OpenAI response:', content)

      if (content) {
        try {
          let cleanContent = content.trim()
          if (cleanContent.startsWith('```json')) {
            cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '')
          } else if (cleanContent.startsWith('```')) {
            cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
          }
          
          // Try to extract JSON from response
          const jsonMatch = cleanContent.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            extractedData = JSON.parse(jsonMatch[0]) as OCRExtractedData
            confidence = {
              overall: 0.85,
              vendor: 0.85,
              amount: 0.85,
              date: 0.85
            }
            needsReview = false
            console.log('SUCCESS: Image processed with GPT-4o Vision:', extractedData)
          } else {
            throw new Error('No JSON found in Vision API response')
          }
        } catch (parseError) {
          console.error('Error parsing Vision API response:', parseError)
          console.error('Raw content:', content)
          extractedData = null
        }
      } else {
        console.log('No content received from Vision API')
        extractedData = null
      }
    }

    // Check if we have valid extracted data
    console.log('Checking extractedData before fallback:', extractedData ? 'HAS DATA' : 'NULL/UNDEFINED')
    
    if (!extractedData) {
      console.log('Using fallback mock data...')
      extractedData = {
        vendor: 'Fallback Vendor',
        description: 'Document processing fallback',
        date: new Date().toISOString().split('T')[0],
        gross_amount: 50.00,
        net_amount: 42.02,
        vat_amount: 7.98,
        vat_rate: 19,
        type: 'expense',
        currency: 'EUR'
      }
      confidence = { overall: 0.5, vendor: 0.5, amount: 0.5, date: 0.5 }
      needsReview = true
    }

    // Prepare data for database update
    const dataForUpdate = extractedData as OCRExtractedData
    const updateData = {
      vendor: dataForUpdate.vendor,
      description: dataForUpdate.description,
      date: dataForUpdate.date,
      gross_amount: dataForUpdate.gross_amount,
      net_amount: dataForUpdate.net_amount,
      vat_amount: dataForUpdate.vat_amount,
      vat_rate: dataForUpdate.vat_rate,
      type: dataForUpdate.type,
      currency: dataForUpdate.currency,
      ocr_provider: 'openai-gpt4o-universal',
      confidence: confidence,
      needs_review: needsReview,
      raw_ocr_json: dataForUpdate
    }

    console.log('SUCCESS: Prepared extraction data:', updateData)

    // Update receipt in database
    const { data: updatedReceipt, error: updateError } = await supabase
      .from('receipts')
      .update(updateData)
      .eq('id', receiptId)
      .select()

    if (updateError) {
      console.error('Database update error:', updateError)
      throw new Error('Failed to update receipt in database')
    }

    console.log('SUCCESS: Database updated:', updatedReceipt)

    return NextResponse.json({
      success: true,
      data: updateData,
      message: 'OCR processing completed and database updated successfully',
      provider: 'openai-gpt4o-universal',
      confidence: confidence
    })

  } catch (error) {
    console.error('OCR API error:', error)
    return NextResponse.json(
      { error: 'Internal server error during OCR processing' },
      { status: 500 }
    )
  }
}
