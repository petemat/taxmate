const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Test direkte PDF-Übergabe an GPT-4o ohne Text-Extraktion
async function testDirectPDFToGPT4o() {
  console.log('=== TEST: DIREKTE PDF-ÜBERGABE AN GPT-4o ===\n');
  
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

  // Test 1: Base64 PDF direkt an GPT-4o
  console.log('\n🧪 Test 1: Base64 PDF direkt an GPT-4o...');
  try {
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
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${base64PDF}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    console.log('✅ Base64 PDF Erfolg:');
    console.log(response.choices[0]?.message?.content);
    console.log('Tokens verwendet:', response.usage?.total_tokens);
    
  } catch (error) {
    console.log('❌ Base64 PDF Fehler:', error.message);
  }

  // Test 2: PDF als Dokument-Upload
  console.log('\n🧪 Test 2: PDF File Upload...');
  try {
    // File Upload
    const file = await openai.files.create({
      file: fs.createReadStream(pdfPath),
      purpose: 'assistants'
    });
    
    console.log('📎 Datei hochgeladen:', file.id);

    // Assistants API Test
    const assistant = await openai.beta.assistants.create({
      name: "PDF OCR Assistant",
      instructions: `Du bist ein Experte für deutsche Rechnungsanalyse. Analysiere PDFs und extrahiere Rechnungsdaten im JSON Format:

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
}`,
      model: "gpt-4o",
      tools: [{"type": "file_search"}]
    });

    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: "Analysiere diese deutsche Rechnung und extrahiere die Daten im JSON Format.",
          attachments: [
            {
              file_id: file.id,
              tools: [{"type": "file_search"}]
            }
          ]
        }
      ]
    });

    const run = await openai.beta.threads.runs.create(
      thread.id,
      { assistant_id: assistant.id }
    );

    // Warten auf Completion
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    if (runStatus.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(thread.id);
      const response = messages.data[0].content[0];
      
      console.log('✅ Assistants API Erfolg:');
      console.log(response.text.value);
    } else {
      console.log('❌ Assistants API Fehler:', runStatus.status);
    }

    // Cleanup
    await openai.files.del(file.id);
    await openai.beta.assistants.del(assistant.id);
    
  } catch (error) {
    console.log('❌ File Upload Fehler:', error.message);
  }

  // Test 3: Neueste GPT-4o Varianten
  console.log('\n🧪 Test 3: Neueste GPT-4o Modelle...');
  
  const models = ['gpt-4o-2024-08-06', 'gpt-4o-2024-05-13'];
  const pdfBuffer = fs.readFileSync(pdfPath);
  const base64PDF = pdfBuffer.toString('base64');
  
  for (const model of models) {
    try {
      console.log(`Testing ${model}...`);
      
      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analysiere diese deutsche Rechnung und extrahiere die Daten im JSON Format."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64PDF}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      });

      console.log(`✅ ${model} Erfolg:`, response.choices[0]?.message?.content?.substring(0, 100) + '...');
      
    } catch (error) {
      console.log(`❌ ${model} Fehler:`, error.message);
    }
  }
}

testDirectPDFToGPT4o().catch(console.error);
