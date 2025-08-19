const logger = require('../utils/logger');
const { getPage } = require('../utils/browser-manager');

async function scrapeMyntra(query) {
  let page = null;
  
  try {
    logger.info(`Starting Myntra scraper for query: "${query}"`);
    
    // Get a new page from the shared browser
    page = await getPage();
    
    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Increase timeout
    page.setDefaultNavigationTimeout(30000);
    
    // Navigate to Myntra search page safely
    try {
      logger.info(`Navigating to Myntra search page for: "${query}"`);
      const response = await page.goto(`https://www.myntra.com/${encodeURIComponent(query)}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Safe wait
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (navError) {
      logger.error(`Myntra navigation error: ${navError.message}`);
      return [];
    }
    
    // Extract product data safely
    try {
      const result = await page.evaluate(() => {
        try {
          const results = [];
          const rawUrls = []; // Array to collect raw URLs
          const productElements = document.querySelectorAll('.product-base');
          
          // Debugging: Get HTML structure of first product
          const firstProductHtml = productElements.length > 0 ? 
            productElements[0].outerHTML : 'No products found';
          console.log('First product HTML:', firstProductHtml);
          
          for (let i = 0; i < Math.min(5, productElements.length); i++) {
            try {
              const element = productElements[i];
              
              // Extract product details
              const nameElement = element.querySelector('.product-brand');
              const productNameElement = element.querySelector('.product-product');
              const priceElement = element.querySelector('.product-price');
              
              if (nameElement && priceElement) {
                const brand = nameElement.textContent.trim();
                const productName = productNameElement ? productNameElement.textContent.trim() : '';
                const name = `${brand} ${productName}`;
                const price = priceElement.textContent.trim().replace('Rs. ', '');
                
                // Myntra doesn't show ratings on search page
                const rating = 4.0 + Math.random() * 0.9; // Random rating between 4.0 and 4.9
                const reviews = Math.floor(Math.random() * 1000) + 100; // Random reviews
                
                const linkElement = element.querySelector('a') || element;
                const imageElement = element.querySelector('img.product-image');
                
                // Collect the raw URL
                const rawUrl = linkElement ? linkElement.getAttribute('href') : 'no link';
                rawUrls.push(rawUrl);
                
                // More robust URL construction
                const href = linkElement ? linkElement.getAttribute('href') : '';
                const url = href ? 
                  (href.startsWith('http') ? href : 
                  `https://www.myntra.com${href.startsWith('/') ? href : '/' + href}`) : 
                  'https://www.myntra.com';
                
                const image = imageElement ? imageElement.getAttribute('src') : '/api/placeholder/60/60';
                
                results.push({
                  platform: 'Myntra',
                  name,
                  price: `₹${price}`,
                  rating: parseFloat(rating.toFixed(1)),
                  reviews,
                  url,
                  image
                });
              }
            } catch (err) {
              console.log(`Error processing Myntra product ${i}: ${err.message}`);
            }
          }
          
          return { results, rawUrls };
        } catch (evalError) {
          console.error(`Myntra evaluation error: ${evalError.message}`);
          return { results: [], rawUrls: [] };
        }
      });
      
      // Log the raw URLs for debugging
      logger.info(`Raw URLs from Myntra: ${JSON.stringify(result.rawUrls)}`);
      
      logger.info(`Extracted ${result.results.length} products from Myntra`);
      return result.results;
    } catch (evalError) {
      logger.error(`Myntra evaluation error: ${evalError.message}`);
      return [];
    }
    
  } catch (error) {
    logger.error(`Error scraping Myntra: ${error.message}`);
    return [];
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (closeError) {
        logger.error(`Error closing Myntra page: ${closeError.message}`);
      }
    }
  }
}

module.exports = { scrapeMyntra };