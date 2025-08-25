const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Test script to check if GPT-4o can process PDFs directly
async function testGPT4oPDF() {
  console.log('=== Testing GPT-4o PDF Processing ===');
  
  // Check if API key is available from environment or prompt user
  let apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ OPENAI_API_KEY not found in environment variables');
    console.log('Please set OPENAI_API_KEY in your .env.local file or environment');
    return;
  }
  
  const openai = new OpenAI({
    apiKey: apiKey,
  });

  // Path to a test PDF file
  const pdfPath = path.join(__dirname, '..', 'Free2move_DE_241218_7672930_3285000075602276.pdf');
  
  if (!fs.existsSync(pdfPath)) {
    console.error('PDF file not found at:', pdfPath);
    return;
  }

  console.log('PDF file found:', pdfPath);
  
  try {
    // Test 1: Try with file upload API
    console.log('\n--- Test 1: File Upload API ---');
    
    const file = await openai.files.create({
      file: fs.createReadStream(pdfPath),
      purpose: 'assistants'
    });
    
    console.log('File uploaded:', file.id);
    
    // Test with different models
    const models = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'];
    
    for (const model of models) {
      console.log(`\n--- Testing model: ${model} ---`);
      
      try {
        const response = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze this German receipt/invoice PDF and extract the following information in JSON format:

{
  "vendor": "Company name",
  "description": "Brief description of goods/services", 
  "date": "YYYY-MM-DD format",
  "gross_amount": "Total amount including VAT as number",
  "net_amount": "Net amount excluding VAT as number",
  "vat_amount": "VAT amount as number",
  "vat_rate": "VAT percentage as number (e.g. 19, 7)",
  "type": "expense or income",
  "currency": "EUR"
}

Return only valid JSON.`
                },
                {
                  type: "file",
                  file_id: file.id
                }
              ]
            }
          ],
          max_tokens: 1000
        });

        console.log(`✅ ${model} SUCCESS:`, response.choices[0]?.message?.content);
        
      } catch (error) {
        console.log(`❌ ${model} FAILED:`, error.message);
      }
    }
    
    // Clean up uploaded file
    await openai.files.del(file.id);
    console.log('File deleted:', file.id);
    
  } catch (error) {
    console.error('File upload failed:', error.message);
  }

  try {
    // Test 2: Try with base64 encoding
    console.log('\n--- Test 2: Base64 PDF ---');
    
    const pdfBuffer = fs.readFileSync(pdfPath);
    const base64PDF = pdfBuffer.toString('base64');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this German receipt/invoice PDF and extract the following information in JSON format:

{
  "vendor": "Company name",
  "description": "Brief description of goods/services",
  "date": "YYYY-MM-DD format", 
  "gross_amount": "Total amount including VAT as number",
  "net_amount": "Net amount excluding VAT as number",
  "vat_amount": "VAT amount as number",
  "vat_rate": "VAT percentage as number (e.g. 19, 7)",
  "type": "expense or income",
  "currency": "EUR"
}

Return only valid JSON.`
            },
            {
              type: "file",
              data: `data:application/pdf;base64,${base64PDF}`
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    console.log('✅ Base64 PDF SUCCESS:', response.choices[0]?.message?.content);
    
  } catch (error) {
    console.log('❌ Base64 PDF FAILED:', error.message);
  }

  try {
    // Test 3: Try direct PDF content with gpt-4o (text-only)
    console.log('\n--- Test 3: Direct PDF Text Extraction ---');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: "user",
          content: `I have a German receipt/invoice PDF that I need to analyze. Can you process PDF files directly for text extraction and data analysis? If yes, please confirm the correct format to send PDF data to you.`
        }
      ],
      max_tokens: 500
    });

    console.log('✅ Model capabilities response:', response.choices[0]?.message?.content);
    
  } catch (error) {
    console.log('❌ Model capabilities test FAILED:', error.message);
  }
}

// Run the test
testGPT4oPDF().catch(console.error);
