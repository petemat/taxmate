#!/usr/bin/env node

/**
 * Connect to Real Chrome Test Script
 * Tests the application using your actual Chrome browser with your profile
 * 
 * Instructions:
 * 1. Close ALL Chrome windows completely
 * 2. Run this script - it will start Chrome with your real profile + debugging
 * 3. The script will connect to your Chrome with all your logins intact
 */

const puppeteer = require('puppeteer-core');
const { exec } = require('child_process');
const path = require('path');
const os = require('os');

async function findChromeUserDataDir() {
  // Default Chrome user data directory on macOS
  const defaultPath = path.join(os.homedir(), 'Library/Application Support/Google/Chrome');
  return defaultPath;
}

async function testWithRealChrome() {
  console.log('🧪 Testing with your real Chrome profile...\n');

  let browser;
  let page;
  let chromeProcess;

  try {
    // Find your actual Chrome profile
    const userDataDir = await findChromeUserDataDir();
    console.log(`📁 Using Chrome profile: ${userDataDir}`);

    // Start Chrome with your real profile and remote debugging
    console.log('🚀 Starting Chrome with your profile and remote debugging...');
    
    const chromeCommand = `/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 --user-data-dir="${userDataDir}" --no-first-run --no-default-browser-check`;
    
    chromeProcess = exec(chromeCommand, (error, stdout, stderr) => {
      if (error && !error.message.includes('SIGTERM')) {
        console.error('Chrome process error:', error);
      }
    });

    // Wait for Chrome to start
    console.log('⏳ Waiting for Chrome to start...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Connect to Chrome
    console.log('🔗 Connecting to Chrome...');
    browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null
    });
    
    console.log('✅ Connected to your real Chrome with your profile!');

    // Get existing pages or create new one
    const pages = await browser.pages();
    
    // Look for existing localhost tab or create new one
    let targetPage = null;
    for (const p of pages) {
      const url = p.url();
      if (url.includes('localhost:3000')) {
        targetPage = p;
        console.log('📄 Found existing localhost tab');
        break;
      }
    }
    
    if (!targetPage) {
      targetPage = await browser.newPage();
      console.log('📄 Created new tab');
    }
    
    page = targetPage;
    
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

    // Check if already logged in or on login page
    try {
      // Check for dashboard elements (if already logged in)
      const dashboardTitle = await page.$('h1:contains("Matero Abrechnung")');
      if (dashboardTitle) {
        console.log('✅ Already logged in - dashboard detected');
        
        // Check for receipts table
        const receiptsTable = await page.$('table');
        if (receiptsTable) {
          console.log('✅ Receipts table found');
        }
        
        // Check for logout button
        const logoutButton = await page.$('button:contains("Abmelden")');
        if (logoutButton) {
          console.log('✅ Logout button found');
        }
        
      } else {
        // Check for login elements
        const googleButton = await page.$('button');
        if (googleButton) {
          const buttonText = await page.evaluate(el => el.textContent, googleButton);
          console.log(`🔍 Found button: "${buttonText}"`);
          
          if (buttonText.includes('Google')) {
            console.log('✅ Google login button found - ready for OAuth');
          }
        }
      }
    } catch (error) {
      console.log('⚠️  Element check failed:', error.message);
    }

    // Get page content for debugging
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('\n📄 Page content preview:');
    console.log(bodyText.substring(0, 400) + '...');

    console.log('\n🎉 Test completed successfully!');
    console.log('💡 Chrome remains open with your profile for manual testing');
    console.log('💡 You can now test Google OAuth with your existing login');

  } catch (error) {
    console.error('💥 Test Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Chrome may not have started properly. Try:');
      console.log('1. Close all Chrome windows');
      console.log('2. Wait a few seconds');
      console.log('3. Run this script again');
    }
  } finally {
    // Disconnect but don't close Chrome
    if (browser && browser.disconnect) {
      browser.disconnect();
      console.log('🔌 Disconnected from Chrome (browser remains open)');
    }
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Script terminated - Chrome remains open');
  process.exit(0);
});

// Run the test
if (require.main === module) {
  testWithRealChrome().catch(console.error);
}

module.exports = { testWithRealChrome };
