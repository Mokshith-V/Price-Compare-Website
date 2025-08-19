// utils/browser-manager.js
const puppeteer = require('puppeteer');
const logger = require('./logger');

let browser = null;
let isInitializing = false;
const waitingForBrowser = [];

async function getBrowser() {
  if (browser) return browser;
  
  if (isInitializing) {
    // Wait for the browser to be initialized by another request
    return new Promise((resolve) => {
      waitingForBrowser.push(resolve);
    });
  }
  
  isInitializing = true;
  
  try {
    logger.info('Launching browser instance...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    // Handle browser disconnection
    browser.on('disconnected', () => {
      logger.warn('Browser disconnected, will create a new instance on next request');
      browser = null;
    });
    
    logger.info('Browser instance ready');
    
    // Resolve any waiting promises
    waitingForBrowser.forEach(resolve => resolve(browser));
    waitingForBrowser.length = 0;
    
    return browser;
  } catch (error) {
    logger.error('Error launching browser:', error);
    browser = null;
    isInitializing = false;
    throw error;
  } finally {
    isInitializing = false;
  }
}

async function getPage() {
  const browser = await getBrowser();
  return await browser.newPage();
}

// Proper cleanup on process exit
process.on('exit', async () => {
  if (browser) {
    await browser.close();
  }
});

module.exports = { getBrowser, getPage };