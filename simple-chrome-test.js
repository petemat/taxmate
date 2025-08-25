#!/usr/bin/env node

/**
 * Simple Chrome Test - No Remote Debugging
 * Just launches Chrome normally and opens the app
 */

const { exec } = require('child_process');

async function openChromeSimple() {
  console.log('🚀 Opening Chrome with your application...\n');

  try {
    // Simply open Chrome with the localhost URL
    const command = 'open -a "Google Chrome" http://localhost:3000';
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error opening Chrome:', error.message);
        return;
      }
      
      console.log('✅ Chrome opened successfully');
      console.log('🌐 Navigated to: http://localhost:3000');
      console.log('💡 You can now test manually with your existing Google login');
      console.log('💡 Check browser console (F12) for any errors');
    });

  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

// Run immediately
openChromeSimple();
