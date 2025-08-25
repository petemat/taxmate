const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Test Assistants API für PDF-Verarbeitung
async function testAssistantsPDF() {
  console.log('=== TEST: ASSISTANTS API FÜR PDF-VERARBEITUNG ===\n');
  
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
    // 1. PDF hochladen
    console.log('📤 Uploading PDF...');
    const file = await openai.files.create({
      file: fs.createReadStream(pdfPath),
      purpose: 'assistants'
    });
    
    console.log('✅ PDF uploaded, File ID:', file.id);

    // 2. Assistant erstellen
    console.log('🤖 Creating Assistant...');
    const assistant = await openai.beta.assistants.create({
      name: "Receipt OCR Assistant",
      instructions: `Du bist ein Experte für deutsche Rechnungsanalyse. Analysiere PDFs und extrahiere Rechnungsdaten im JSON Format:

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

Gib nur gültiges JSON zurück, keine zusätzlichen Erklärungen.`,
      model: "gpt-4o",
      tools: [{"type": "file_search"}]
    });

    console.log('✅ Assistant created:', assistant.id);

    // 3. Thread mit PDF erstellen
    console.log('💬 Creating Thread...');
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

    console.log('✅ Thread created:', thread.id);

    // 4. Run starten
    console.log('🏃 Starting Run...');
    const run = await openai.beta.threads.runs.create(
      thread.id,
      { assistant_id: assistant.id }
    );

    console.log('✅ Run started:', run.id);

    // 5. Auf Completion warten
    console.log('⏳ Waiting for completion...');
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    let attempts = 0;
    const maxAttempts = 60; // 60 Sekunden timeout
    
    while ((runStatus.status === 'in_progress' || runStatus.status === 'queued') && attempts < maxAttempts) {
      console.log(`Status: ${runStatus.status} (${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
    }

    console.log('Final status:', runStatus.status);

    if (runStatus.status === 'completed') {
      // 6. Antwort abrufen
      const messages = await openai.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data[0];
      
      if (assistantMessage.content[0].type === 'text') {
        const content = assistantMessage.content[0].text.value;
        console.log('\n✅ SUCCESS: Assistant Response:');
        console.log(content);
        
        // JSON extrahieren
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const extractedData = JSON.parse(jsonMatch[0]);
            console.log('\n🎯 Extracted JSON:');
            console.log(JSON.stringify(extractedData, null, 2));
          } catch (e) {
            console.log('❌ JSON Parse Error:', e.message);
          }
        }
      }
    } else if (runStatus.status === 'failed') {
      console.log('❌ Run failed:', runStatus.last_error);
    } else {
      console.log('❌ Run timed out or unexpected status:', runStatus.status);
    }

    // 7. Cleanup
    console.log('\n🧹 Cleaning up...');
    await openai.files.delete(file.id);
    await openai.beta.assistants.delete(assistant.id);
    console.log('✅ Cleanup completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.error) {
      console.error('Details:', error.error);
    }
  }
}

testAssistantsPDF().catch(console.error);
