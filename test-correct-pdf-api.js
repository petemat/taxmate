const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Test korrekte PDF-Verarbeitung mit OpenAI API
async function testCorrectPDFAPI() {
  console.log('=== TEST: KORREKTE PDF-VERARBEITUNG MIT OPENAI API ===\n');
  
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

  // Test 1: Files API Upload (Empfohlene Methode)
  console.log('\n🧪 Test 1: Files API Upload...');
  try {
    // 1. PDF hochladen
    const file = await openai.files.create({
      file: fs.createReadStream(pdfPath),
      purpose: 'vision'
    });
    
    console.log('📎 PDF hochgeladen, File ID:', file.id);

    // 2. Chat Completion mit File ID
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analysiere diese deutsche Rechnung/PDF und extrahiere folgende Informationen im JSON Format:

{
  "vendor": "Firmenname",
  "description": "Kurze Beschreibung",
  "date": "YYYY-MM-DD",
  "gross_amount": "Gesamtbetrag als Zahl",
  "net_amount": "Nettobetrag als Zahl",
  "vat_amount": "MwSt-Betrag als Zahl",
  "vat_rate": "MwSt-Prozentsatz als Zahl",
  "type": "expense",
  "currency": "EUR"
}

Nur gültiges JSON zurückgeben.`
            },
            {
              type: 'file',
              file_id: file.id
            }
          ]
        }
      ]
    });

    console.log('✅ Files API Erfolg:');
    console.log('Response:', response.choices[0]?.message?.content);
    console.log('Tokens verwendet:', response.usage?.total_tokens);
    
    // Cleanup
    await openai.files.del(file.id);
    console.log('🗑️ Temporäre Datei gelöscht');
    
  } catch (error) {
    console.log('❌ Files API Fehler:', error.message);
    console.log('Error details:', error.error || error);
  }

  // Test 2: Base64 PDF (Alternative Methode)
  console.log('\n🧪 Test 2: Base64 PDF direkt...');
  try {
    const pdfBuffer = fs.readFileSync(pdfPath);
    const base64PDF = pdfBuffer.toString('base64');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analysiere diese deutsche Rechnung/PDF und extrahiere die Daten im JSON Format.`
            },
            {
              type: 'file',
              file: {
                data: base64PDF,
                mime_type: 'application/pdf'
              }
            }
          ]
        }
      ]
    });

    console.log('✅ Base64 PDF Erfolg:');
    console.log('Response:', response.choices[0]?.message?.content);
    console.log('Tokens verwendet:', response.usage?.total_tokens);
    
  } catch (error) {
    console.log('❌ Base64 PDF Fehler:', error.message);
    console.log('Error details:', error.error || error);
  }

  // Test 3: Neueste API-Syntax testen
  console.log('\n🧪 Test 3: Neueste API-Syntax...');
  try {
    const pdfBuffer = fs.readFileSync(pdfPath);
    const base64PDF = pdfBuffer.toString('base64');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analysiere diese deutsche Rechnung und extrahiere die wichtigsten Daten.'
            },
            {
              type: 'input_pdf',
              input_pdf: {
                data: base64PDF
              }
            }
          ]
        }
      ]
    });

    console.log('✅ Neueste Syntax Erfolg:');
    console.log('Response:', response.choices[0]?.message?.content);
    
  } catch (error) {
    console.log('❌ Neueste Syntax Fehler:', error.message);
  }
}

testCorrectPDFAPI().catch(console.error);
