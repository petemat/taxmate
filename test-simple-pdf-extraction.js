const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Einfacher Test für PDF-Text-Extraktion ohne Assistants API
async function testSimplePDFExtraction() {
  console.log('=== TEST: EINFACHE PDF-TEXT-EXTRAKTION ===\n');
  
  let apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ OPENAI_API_KEY nicht gefunden');
    return;
  }
  
  const openai = new OpenAI({ apiKey });
  const pdfPath = path.join(__dirname, '..', 'rechnung_beispiel.pdf');
  
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ PDF-Datei nicht gefunden:', pdfPath);
    return;
  }

  console.log('📄 PDF-Datei gefunden:', pdfPath);

  try {
    // PDF-Text mit pdf-parse extrahieren
    console.log('📤 Extracting text from PDF...');
    const pdfParse = require('pdf-parse');
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(pdfBuffer);
    const extractedText = pdfData.text;
    
    console.log('✅ Text extracted, length:', extractedText.length);
    console.log('First 500 chars:', extractedText.substring(0, 500));
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from PDF');
    }

    // Text mit GPT-4o analysieren
    console.log('\n🤖 Analyzing with GPT-4o...');
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
  "gross_amount": "Gesamtbetrag als Zahl",
  "net_amount": "Nettobetrag als Zahl",
  "vat_amount": "MwSt-Betrag als Zahl",
  "vat_rate": "MwSt-Prozentsatz als Zahl",
  "type": "expense",
  "currency": "EUR"
}

Text zu analysieren:
${extractedText}`
        }
      ],
      max_tokens: 1000
    });

    const content = response.choices[0]?.message?.content;
    console.log('\n✅ GPT-4o Response:');
    console.log(content);
    console.log('\nTokens used:', response.usage?.total_tokens);

    if (content) {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extractedData = JSON.parse(jsonMatch[0]);
          console.log('\n🎯 Extracted JSON:');
          console.log(JSON.stringify(extractedData, null, 2));
          return extractedData;
        }
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSimplePDFExtraction().catch(console.error);
