# TaxMate

AI-powered receipt management and tax optimization tool built with Next.js, Supabase, and OpenAI GPT-4o.

## Features

- **Smart OCR Processing**: Automatic text extraction from PDFs using pdf-parse and AI analysis with GPT-4o
- **Image Recognition**: Direct image analysis using GPT-4o Vision API
- **Secure Storage**: Supabase integration with signed URLs for file security
- **Mobile Responsive**: Optimized UI for both desktop and mobile devices
- **Real-time Processing**: Live status indicators during OCR processing
- **German Tax Compliance**: Structured data extraction for German receipts and invoices

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes with Node.js runtime
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage with signed URLs
- **AI**: OpenAI GPT-4o (Chat Completions + Vision API)
- **PDF Processing**: pdf-parse library
- **Authentication**: Supabase Auth

## Getting Started

1. **Clone the repository**
```bash
git clone <repository-url>
cd taxmate
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Copy `env.template` to `.env.local` and configure:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

4. **Run development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## API Endpoints

- `POST /api/ocr` - Process receipts with OCR and AI analysis
- Authentication handled by Supabase Auth

## Production Notes

- Uses Node.js runtime for pdf-parse compatibility
- Includes postinstall script to prevent ENOENT errors
- 30-second timeout on OCR requests
- Comprehensive error handling and fallback data

## Development

```bash
npm run dev      # Development server with Turbopack
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint (warnings ignored in builds)
```
