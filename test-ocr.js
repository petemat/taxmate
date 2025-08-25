#!/usr/bin/env node

/**
 * OCR API Test Script
 * Tests real document extraction using OpenAI GPT-4 Vision API
 * Usage: node test-ocr.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testOCRAPI() {
  console.log('🧪 Testing OCR API with real document extraction...\n');

  // Check if OpenAI API key is configured
  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  OPENAI_API_KEY not found in environment variables');
    console.log('   OCR will use fallback mock data instead of real extraction');
    console.log('   To test real OCR, add your OpenAI API key to .env.local\n');
  } else {
    console.log('✅ OpenAI API key found - will test real document extraction\n');
  }

  const testFileUrl = '/Users/Peter.Materowicz/Documents/Matero_Abrechnung/rechnung_beispiel.pdf';

  console.log('📄 Test Parameters:');
  console.log(`   Example file: ${testFileUrl}`);
  console.log(`   File exists: ${fs.existsSync(testFileUrl) ? '✅ Yes' : '❌ No'}\n`);

  try {
    // Step 1: Get existing receipts from the database to test with
    console.log('🔍 Finding existing receipts to test OCR...');
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: receipts, error: fetchError } = await supabase
      .from('receipts')
      .select('id, vendor, source_file_url, created_at')
      .limit(5)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching receipts:', fetchError);
      return;
    }

    if (!receipts || receipts.length === 0) {
      console.log('📝 No receipts found in database. Please upload a file first through the web interface.');
      return;
    }

    console.log(`📊 Found ${receipts.length} receipts in database:`);
    receipts.forEach((receipt, i) => {
      console.log(`   ${i + 1}. ${receipt.id} - ${receipt.vendor || 'No vendor'} (${receipt.created_at})`);
    });

    // Use the most recent receipt for testing
    const testReceipt = receipts[0];
    console.log(`\n🎯 Testing OCR with receipt: ${testReceipt.id}\n`);

    // Step 2: Test the OCR API endpoint
    console.log('🚀 Calling OCR API...');
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch('http://localhost:3000/api/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        receiptId: testReceipt.id 
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    console.log(`📡 Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      return;
    }

    const result = await response.json();
    
    console.log('\n📊 OCR Extraction Results:');
    console.log('=' .repeat(50));
    console.log(`Provider: ${result.provider || 'Unknown'}`);
    console.log(`Success: ${result.success ? '✅' : '❌'}`);
    console.log(`Message: ${result.message}`);
    
    if (result.confidence) {
      console.log('\n🎯 Confidence Scores:');
      console.log(`   Overall: ${(result.confidence.overall * 100).toFixed(1)}%`);
      console.log(`   Vendor: ${(result.confidence.vendor * 100).toFixed(1)}%`);
      console.log(`   Amount: ${(result.confidence.amount * 100).toFixed(1)}%`);
      console.log(`   Date: ${(result.confidence.date * 100).toFixed(1)}%`);
    }

    if (result.extractedData) {
      console.log('\n💰 Extracted Data:');
      console.log(`   Vendor: ${result.extractedData.vendor}`);
      console.log(`   Description: ${result.extractedData.description}`);
      console.log(`   Date: ${result.extractedData.date}`);
      console.log(`   Gross Amount: €${result.extractedData.gross_amount}`);
      console.log(`   Net Amount: €${result.extractedData.net_amount}`);
      console.log(`   VAT Amount: €${result.extractedData.vat_amount}`);
      console.log(`   VAT Rate: ${result.extractedData.vat_rate}%`);
      console.log(`   Type: ${result.extractedData.type}`);
      console.log(`   Currency: ${result.extractedData.currency}`);
      console.log(`   Needs Review: ${result.extractedData.needs_review ? '⚠️ Yes' : '✅ No'}`);
    }

    console.log('\n' + '=' .repeat(50));
    
    if (result.success) {
      console.log('🎉 OCR Test PASSED - Document extraction successful!');
      
      if (result.provider === 'openai-gpt4-vision') {
        console.log('✨ Real OpenAI GPT-4 Vision extraction was used');
      } else {
        console.log('📝 Fallback mock data was used (no OpenAI key or error)');
      }
    } else {
      console.log('❌ OCR Test FAILED');
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('💥 Test Error: Request timed out after 30 seconds');
      console.error('   The OCR API call is taking too long - check server logs');
    } else {
      console.error('💥 Test Error:', error.message);
      console.error('   Make sure the development server is running (npm run dev)');
    }
  }
}

// Run the test
if (require.main === module) {
  testOCRAPI().catch(console.error);
}

module.exports = { testOCRAPI };
