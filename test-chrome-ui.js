#!/usr/bin/env node

/**
 * Chrome UI Test Script
 * Tests the application using your existing Chrome browser
 * Usage: node test-chrome-ui.js
 */

const puppeteer = require('puppeteer');
const path = require('path');

async function testWithChrome() {
  console.log('🧪 Testing Matero Abrechnung with your Chrome browser...\n');

  let browser;
  let page;

  try {
    // Connect to your existing Chrome browser
    // First, start Chrome with remote debugging enabled:
    // /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
    
    console.log('🔗 Attempting to connect to Chrome...');
    
    // Try to connect to existing Chrome instance
    try {
      browser = await puppeteer.connect({
        browserURL: 'http://localhost:9222',
        defaultViewport: null
      });
      console.log('✅ Connected to existing Chrome instance');
    } catch (connectError) {
      console.log('⚠️  Could not connect to existing Chrome. Starting new instance...');
      
      // Fallback: Launch Chrome with your profile
      browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: false,
        defaultViewport: null,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--start-maximized'
        ]
      });
      console.log('✅ Started new Chrome instance');
    }

    // Create a new page
    page = await browser.newPage();
    
    // Enable console logging before navigation
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      console.log(`[CONSOLE ${type.toUpperCase()}] ${text}`);
    });

    // Enable error logging
    page.on('pageerror', error => {
      console.error(`[PAGE ERROR] ${error.message}`);
    });
    
    // Navigate to the application
    console.log('🚀 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle0',
      timeout: 15000 
    });
    
    // Wait for React to initialize using setTimeout wrapped in Promise
    console.log('⏳ Waiting for React to initialize...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('✅ Page loaded successfully');

    // Check if we're on the login page
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);

    // Take a screenshot
    const screenshotPath = path.join(__dirname, 'chrome-test-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);

    // Check for login elements
    try {
      await page.waitForSelector('button:has-text("Mit Google anmelden")', { timeout: 5000 });
      console.log('✅ Google login button found');
      
      // Get page content
      const content = await page.evaluate(() => document.body.innerText);
      console.log('\n📝 Page content preview:');
      console.log(content.substring(0, 500) + '...');
      
    } catch (error) {
      console.log('⚠️  Google login button not found - checking if already logged in...');
      
      // Check if we're already on the dashboard
      try {
        await page.waitForSelector('h1:has-text("Matero Abrechnung")', { timeout: 3000 });
        console.log('✅ Already logged in - dashboard detected');
      } catch (dashError) {
        console.log('❌ Neither login page nor dashboard detected');
      }
    }

    // Test Google OAuth if login button is present
    try {
      const googleButton = await page.$('button:has-text("Mit Google anmelden")');
      if (googleButton) {
        console.log('\n🔐 Testing Google OAuth login...');
        await googleButton.click();
        
        // Wait for navigation or popup
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if we're redirected to Google or dashboard
        const currentUrl = page.url();
        console.log(`🌐 Current URL: ${currentUrl}`);
        
        if (currentUrl.includes('google.com')) {
          console.log('✅ Successfully redirected to Google OAuth');
        } else if (currentUrl.includes('localhost:3000') && !currentUrl.includes('auth')) {
          console.log('✅ Successfully logged in and redirected to dashboard');
        }
      }
    } catch (oauthError) {
      console.log(`⚠️  OAuth test error: ${oauthError.message}`);
    }

    console.log('\n🎉 Chrome UI test completed successfully!');

  } catch (error) {
    console.error('💥 Test Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 To connect to your existing Chrome:');
      console.log('1. Close all Chrome windows');
      console.log('2. Run: /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug');
      console.log('3. Then run this test again');
    }
  } finally {
    if (page) {
      await page.close();
    }
    if (browser && browser.disconnect) {
      browser.disconnect();
    }
  }
}

// Run the test
if (require.main === module) {
  testWithChrome().catch(console.error);
}

module.exports = { testWithChrome };
