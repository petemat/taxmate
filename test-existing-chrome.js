#!/usr/bin/env node

/**
 * Connect to Existing Chrome Test Script
 * Tests the application using your currently opened Chrome browser
 * 
 * First run: /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
 * Then run: node test-existing-chrome.js
 */

const puppeteer = require('puppeteer-core');

async function testWithExistingChrome() {
  console.log('🧪 Testing Matero Abrechnung with your existing Chrome...\n');

  let browser;
  let page;

  try {
    console.log('🔗 Connecting to existing Chrome on port 9222...');
    
    // Connect to existing Chrome instance
    browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null
    });
    
    console.log('✅ Connected to existing Chrome successfully');

    // Get existing pages or create new one
    const pages = await browser.pages();
    if (pages.length > 0) {
      page = pages[0]; // Use first existing tab
      console.log('📄 Using existing tab');
    } else {
      page = await browser.newPage();
      console.log('📄 Created new tab');
    }
    
    // Enable console logging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      console.log(`[CONSOLE ${type.toUpperCase()}] ${text}`);
    });

    // Enable error logging
    page.on('pageerror', error => {
      console.error(`[PAGE ERROR] ${error.message}`);
    });

    // Enable request/response logging
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`[HTTP ${response.status()}] ${response.url()}`);
      }
    });
    
    // Navigate to the application
    console.log('🚀 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    console.log('✅ Page loaded successfully');

    // Wait for React to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check page content
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);

    const url = page.url();
    console.log(`🌐 Current URL: ${url}`);

    // Check for login elements
    try {
      const googleButton = await page.$('button:contains("Mit Google anmelden")');
      if (googleButton) {
        console.log('✅ Google login button found');
      } else {
        // Try alternative selector
        const altButton = await page.$('button[type="button"]');
        if (altButton) {
          const buttonText = await page.evaluate(el => el.textContent, altButton);
          console.log(`🔍 Found button with text: "${buttonText}"`);
        }
      }
    } catch (error) {
      console.log('⚠️  Button check failed:', error.message);
    }

    // Get all console logs that happened during page load
    console.log('\n📝 Checking for any console messages...');
    
    // Trigger a page refresh to capture all console logs
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get page content for debugging
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('\n📄 Page content preview:');
    console.log(bodyText.substring(0, 300) + '...');

    console.log('\n🎉 Test completed successfully!');
    console.log('💡 Chrome tab remains open for manual testing');

  } catch (error) {
    console.error('💥 Test Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 To connect to your existing Chrome:');
      console.log('1. Close Chrome completely');
      console.log('2. Run: /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222');
      console.log('3. Then run this test again: node test-existing-chrome.js');
    }
  } finally {
    // Don't close the browser - leave it open for manual testing
    if (browser && browser.disconnect) {
      browser.disconnect();
      console.log('🔌 Disconnected from Chrome (browser remains open)');
    }
  }
}

// Run the test
if (require.main === module) {
  testWithExistingChrome().catch(console.error);
}

module.exports = { testWithExistingChrome };
