const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Umfassender Test aller OpenAI Modelle für OCR-Verarbeitung
async function testAllOpenAIModels() {
  console.log('=== OPENAI MODELLE TEST FÜR OCR VERARBEITUNG ===\n');
  
  let apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ OPENAI_API_KEY nicht gefunden');
    return;
  }
  
  const openai = new OpenAI({ apiKey });

  // Test-Dateien
  const testFiles = {
    pdf: path.join(__dirname, '..', 'Free2move_DE_241218_7672930_3285000075602276.pdf'),
    image: path.join(__dirname, '..', 'Rechnung_foto.png')
  };

  // Alle verfügbaren Modelle
  const models = [
    'gpt-4o',
    'gpt-4o-mini', 
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
    'gpt-4-vision-preview',
    'gpt-4o-2024-08-06',
    'gpt-4o-2024-05-13',
    'gpt-4-turbo-2024-04-09'
  ];

  const results = {
    imageProcessing: {},
    pdfProcessing: {},
    textProcessing: {},
    fileUpload: {}
  };

  // Standard OCR Prompt
  const ocrPrompt = `Analysiere diese deutsche Rechnung/Beleg und extrahiere folgende Informationen im JSON Format:

{
  "vendor": "Firmenname",
  "description": "Kurze Beschreibung der Waren/Dienstleistungen",
  "date": "YYYY-MM-DD Format",
  "gross_amount": "Gesamtbetrag inkl. MwSt als Zahl",
  "net_amount": "Nettobetrag ohne MwSt als Zahl",
  "vat_amount": "MwSt-Betrag als Zahl",
  "vat_rate": "MwSt-Prozentsatz als Zahl (z.B. 19, 7)",
  "type": "expense oder income",
  "currency": "EUR"
}

Nur gültiges JSON zurückgeben.`;

  console.log('📋 Teste Modell-Verfügbarkeit...\n');

  // 1. Test: Modell-Verfügbarkeit prüfen
  try {
    const modelsList = await openai.models.list();
    const availableModels = modelsList.data.map(m => m.id);
    console.log('✅ Verfügbare Modelle:', availableModels.filter(m => models.includes(m)).length, 'von', models.length);
  } catch (error) {
    console.log('❌ Fehler beim Abrufen der Modelle:', error.message);
  }

  // 2. Test: Bild-Verarbeitung (Vision)
  console.log('\n🖼️  BILD-VERARBEITUNG TEST\n');
  
  if (fs.existsSync(testFiles.image)) {
    const imageBuffer = fs.readFileSync(testFiles.image);
    const base64Image = imageBuffer.toString('base64');
    
    for (const model of models) {
      try {
        console.log(`Testing ${model} mit Bild...`);
        
        const response = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: ocrPrompt },
                {
                  type: "image_url",
                  image_url: { url: `data:image/png;base64,${base64Image}` }
                }
              ]
            }
          ],
          max_tokens: 1000
        });

        const content = response.choices[0]?.message?.content;
        results.imageProcessing[model] = {
          success: true,
          response: content?.substring(0, 200) + '...',
          tokens: response.usage?.total_tokens
        };
        console.log(`  ✅ ${model}: Erfolg (${response.usage?.total_tokens} tokens)`);
        
      } catch (error) {
        results.imageProcessing[model] = {
          success: false,
          error: error.message
        };
        console.log(`  ❌ ${model}: ${error.message}`);
      }
    }
  } else {
    console.log('❌ Testbild nicht gefunden');
  }

  // 3. Test: PDF Text-Extraktion + Verarbeitung
  console.log('\n📄 PDF TEXT-VERARBEITUNG TEST\n');
  
  if (fs.existsSync(testFiles.pdf)) {
    try {
      const pdfParse = require('pdf-parse');
      const pdfBuffer = fs.readFileSync(testFiles.pdf);
      const pdfData = await pdfParse(pdfBuffer);
      const extractedText = pdfData.text;
      
      console.log('PDF Text extrahiert:', extractedText.substring(0, 100) + '...\n');
      
      for (const model of models) {
        try {
          console.log(`Testing ${model} mit PDF-Text...`);
          
          const response = await openai.chat.completions.create({
            model: model,
            messages: [
              {
                role: "user",
                content: `${ocrPrompt}\n\nRechnungstext:\n${extractedText}`
              }
            ],
            max_tokens: 1000
          });

          const content = response.choices[0]?.message?.content;
          results.pdfProcessing[model] = {
            success: true,
            response: content?.substring(0, 200) + '...',
            tokens: response.usage?.total_tokens
          };
          console.log(`  ✅ ${model}: Erfolg (${response.usage?.total_tokens} tokens)`);
          
        } catch (error) {
          results.pdfProcessing[model] = {
            success: false,
            error: error.message
          };
          console.log(`  ❌ ${model}: ${error.message}`);
        }
      }
    } catch (error) {
      console.log('❌ PDF-Parse Fehler:', error.message);
    }
  } else {
    console.log('❌ Test-PDF nicht gefunden');
  }

  // 4. Test: Direkte PDF-Verarbeitung (File Upload)
  console.log('\n📎 DIREKTE PDF-VERARBEITUNG TEST\n');
  
  if (fs.existsSync(testFiles.pdf)) {
    for (const model of models) {
      try {
        console.log(`Testing ${model} mit direkter PDF-Verarbeitung...`);
        
        // File Upload
        const file = await openai.files.create({
          file: fs.createReadStream(testFiles.pdf),
          purpose: 'assistants'
        });
        
        const response = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: ocrPrompt },
                { type: "file", file_id: file.id }
              ]
            }
          ],
          max_tokens: 1000
        });

        const content = response.choices[0]?.message?.content;
        results.fileUpload[model] = {
          success: true,
          response: content?.substring(0, 200) + '...',
          tokens: response.usage?.total_tokens
        };
        console.log(`  ✅ ${model}: Erfolg (${response.usage?.total_tokens} tokens)`);
        
        // Cleanup
        await openai.files.del(file.id);
        
      } catch (error) {
        results.fileUpload[model] = {
          success: false,
          error: error.message
        };
        console.log(`  ❌ ${model}: ${error.message}`);
      }
    }
  }

  // 5. Ergebnisse zusammenfassen
  console.log('\n📊 ZUSAMMENFASSUNG DER TESTERGEBNISSE\n');
  
  console.log('🖼️  BILD-VERARBEITUNG:');
  Object.entries(results.imageProcessing).forEach(([model, result]) => {
    const status = result.success ? '✅' : '❌';
    const info = result.success ? `(${result.tokens} tokens)` : `(${result.error})`;
    console.log(`  ${status} ${model} ${info}`);
  });
  
  console.log('\n📄 PDF TEXT-VERARBEITUNG:');
  Object.entries(results.pdfProcessing).forEach(([model, result]) => {
    const status = result.success ? '✅' : '❌';
    const info = result.success ? `(${result.tokens} tokens)` : `(${result.error})`;
    console.log(`  ${status} ${model} ${info}`);
  });
  
  console.log('\n📎 DIREKTE PDF-VERARBEITUNG:');
  Object.entries(results.fileUpload).forEach(([model, result]) => {
    const status = result.success ? '✅' : '❌';
    const info = result.success ? `(${result.tokens} tokens)` : `(${result.error})`;
    console.log(`  ${status} ${model} ${info}`);
  });

  // 6. Empfehlungen
  console.log('\n🎯 EMPFEHLUNGEN:\n');
  
  const imageSuccessModels = Object.entries(results.imageProcessing)
    .filter(([_, result]) => result.success)
    .map(([model, _]) => model);
    
  const pdfSuccessModels = Object.entries(results.pdfProcessing)
    .filter(([_, result]) => result.success)
    .map(([model, _]) => model);
    
  const fileUploadSuccessModels = Object.entries(results.fileUpload)
    .filter(([_, result]) => result.success)
    .map(([model, _]) => model);

  console.log('📈 Beste Modelle für Bilder:', imageSuccessModels.slice(0, 3));
  console.log('📈 Beste Modelle für PDF-Text:', pdfSuccessModels.slice(0, 3));
  console.log('📈 Beste Modelle für direkte PDF-Verarbeitung:', fileUploadSuccessModels.slice(0, 3));
  
  // Universelles Modell finden
  const universalModels = imageSuccessModels.filter(model => 
    pdfSuccessModels.includes(model) || fileUploadSuccessModels.includes(model)
  );
  
  if (universalModels.length > 0) {
    console.log('\n🌟 UNIVERSELLE MODELLE (Bilder + PDFs):');
    universalModels.forEach(model => {
      const imageTokens = results.imageProcessing[model]?.tokens || 0;
      const pdfTokens = results.pdfProcessing[model]?.tokens || 0;
      const fileTokens = results.fileUpload[model]?.tokens || 0;
      console.log(`  ⭐ ${model} - Bild: ${imageTokens}, PDF-Text: ${pdfTokens}, Direkt-PDF: ${fileTokens} tokens`);
    });
    
    console.log(`\n🎯 EMPFEHLUNG: Verwende ${universalModels[0]} für einheitliche OCR-Verarbeitung`);
  } else {
    console.log('\n⚠️  Kein universelles Modell gefunden. Verwende verschiedene Modelle für verschiedene Dateitypen.');
  }

  return results;
}

// Test ausführen
testAllOpenAIModels().catch(console.error);
