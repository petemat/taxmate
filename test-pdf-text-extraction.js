const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Test PDF text extraction + GPT-4o processing
async function testPDFTextExtraction() {
  console.log('=== Testing PDF Text Extraction + GPT-4o ===');
  
  let apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ OPENAI_API_KEY not found');
    return;
  }
  
  const openai = new OpenAI({ apiKey });

  // Test with pdf-parse library
  try {
    const pdfParse = require('pdf-parse');
    const pdfPath = path.join(__dirname, '..', 'Free2move_DE_241218_7672930_3285000075602276.pdf');
    
    if (!fs.existsSync(pdfPath)) {
      console.error('PDF file not found');
      return;
    }

    console.log('📄 Extracting text from PDF...');
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(pdfBuffer);
    
    console.log('✅ PDF text extracted:', pdfData.text.substring(0, 200) + '...');
    
    // Send extracted text to GPT-4o
    console.log('🤖 Sending to GPT-4o for analysis...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: "user",
          content: `Analyze this German receipt/invoice text and extract the following information in JSON format:

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

Receipt text:
${pdfData.text}

Return only valid JSON.`
        }
      ],
      max_tokens: 1000
    });

    console.log('✅ GPT-4o Analysis Result:');
    console.log(response.choices[0]?.message?.content);
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('❌ pdf-parse not installed. Installing...');
      
      const { exec } = require('child_process');
      exec('npm install pdf-parse', (error, stdout, stderr) => {
        if (error) {
          console.error('Installation failed:', error);
        } else {
          console.log('✅ pdf-parse installed. Please run the test again.');
        }
      });
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testPDFTextExtraction().catch(console.error);
