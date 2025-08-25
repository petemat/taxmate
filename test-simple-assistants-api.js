const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Minimaler Test für Assistants API ohne komplexe Parameter
async function testSimpleAssistantsAPI() {
  console.log('=== MINIMALER ASSISTANTS API TEST ===\n');
  
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
      name: "PDF Reader",
      instructions: "Analysiere deutsche Rechnungen und extrahiere wichtige Informationen.",
      model: "gpt-4o",
      tools: [{"type": "file_search"}]
    });

    console.log('✅ Assistant created:', assistant.id);

    // 3. Thread erstellen
    console.log('💬 Creating Thread...');
    const thread = await openai.beta.threads.create();
    console.log('✅ Thread created:', thread.id);

    // 4. Message hinzufügen
    console.log('📝 Adding message...');
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: "Analysiere diese deutsche Rechnung und extrahiere Firma, Betrag und Datum.",
      attachments: [
        {
          file_id: file.id,
          tools: [{"type": "file_search"}]
        }
      ]
    });

    // 5. Run erstellen
    console.log('🏃 Creating run...');
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id
    });

    console.log('✅ Run created:', run.id);

    // 6. Polling mit korrekter Syntax
    console.log('⏳ Polling for completion...');
    let runStatus;
    let attempts = 0;
    const maxAttempts = 30;
    
    do {
      await new Promise(resolve => setTimeout(resolve, 2000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
      console.log(`Status: ${runStatus.status} (${attempts}/${maxAttempts})`);
    } while ((runStatus.status === 'in_progress' || runStatus.status === 'queued') && attempts < maxAttempts);

    console.log('Final status:', runStatus.status);

    if (runStatus.status === 'completed') {
      // 7. Messages abrufen
      const messages = await openai.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
      
      if (assistantMessage && assistantMessage.content[0].type === 'text') {
        console.log('\n✅ SUCCESS: Assistant Response:');
        console.log(assistantMessage.content[0].text.value);
      }
    } else if (runStatus.status === 'failed') {
      console.log('❌ Run failed:', runStatus.last_error);
    } else {
      console.log('❌ Run timed out or unexpected status:', runStatus.status);
    }

    // 8. Cleanup
    console.log('\n🧹 Cleaning up...');
    await openai.files.delete(file.id);
    await openai.beta.assistants.delete(assistant.id);
    console.log('✅ Cleanup completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testSimpleAssistantsAPI().catch(console.error);
