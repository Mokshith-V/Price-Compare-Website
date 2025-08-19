const logger = require('../utils/logger');
const { getPage } = require('../utils/browser-manager');

async function scrapeAmazon(query) {
  let page = null;
  
  try {
    logger.info(`Starting Amazon scraper for query: "${query}"`);
    
    // Get a new page from the shared browser
    page = await getPage();
    
    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Increase timeout
    page.setDefaultNavigationTimeout(30000);
    
    // Navigate to Amazon search page safely
    try {
      logger.info(`Navigating to Amazon search page for: "${query}"`);
      const response = await page.goto(`https://www.amazon.in/s?k=${encodeURIComponent(query)}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Safe wait
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (navError) {
      logger.error(`Amazon navigation error: ${navError.message}`);
      return [];
    }
    
    // Extract product data safely
    try {
      const result = await page.evaluate(() => {
        try {
          const results = [];
          const rawUrls = [];
          
          // Try multiple selectors for product elements
          const selectorOptions = [
            '[data-component-type="s-search-result"]',
            '.s-result-item[data-asin]',
            '.sg-col-4-of-24.sg-col-4-of-12',
            '.s-desktop-width-max.s-desktop-content .s-matching-dir'
          ];
          
          let productElements = [];
          
          // Try each selector until we find products
          for (const selector of selectorOptions) {
            productElements = document.querySelectorAll(selector);
            console.log(`Selector ${selector} found ${productElements.length} elements`);
            if (productElements.length > 0) break;
          }
          
          // Debugging: Get HTML structure of first product
          const firstProductHtml = productElements.length > 0 ? 
            productElements[0].outerHTML.substring(0, 500) + '...' : 'No products found';
          console.log('First product HTML preview:', firstProductHtml);
          
          for (let i = 0; i < Math.min(5, productElements.length); i++) {
            try {
              const element = productElements[i];
              
              // Try different selectors for name
              const nameSelectors = ['h2 a span', '.a-text-normal', '.a-size-base-plus'];
              let nameElement = null;
              for (const selector of nameSelectors) {
                nameElement = element.querySelector(selector);
                if (nameElement) break;
              }
              
              // Try different selectors for price
              const priceSelectors = ['.a-price-whole', '.a-price .a-offscreen', '.a-price'];
              let priceElement = null;
              for (const selector of priceSelectors) {
                priceElement = element.querySelector(selector);
                if (priceElement) break;
              }
              
              if (nameElement) {
                const name = nameElement.textContent.trim();
                const price = priceElement ? priceElement.textContent.trim().replace(/[^0-9,.]/g, '') : '0';
                
                // Extract other details
                const ratingElement = element.querySelector('.a-icon-star-small .a-icon-alt, .a-icon-star .a-icon-alt');
                const reviewCountElement = element.querySelector('span.a-size-base.s-underline-text, .a-size-small .a-link-normal');
                
                // Try different selectors for link
                const linkSelectors = ['h2 a', '.a-link-normal.a-text-normal', '.a-link-normal[href*="/dp/"]'];
                let linkElement = null;
                for (const selector of linkSelectors) {
                  linkElement = element.querySelector(selector);
                  if (linkElement) break;
                }
                
                const imageElement = element.querySelector('img.s-image, .s-product-image-container img');
                
                const rating = ratingElement ? parseFloat(ratingElement.textContent.split(' ')[0].trim()) : 4.0;
                const reviews = reviewCountElement ? parseInt(reviewCountElement.textContent.replace(/[^0-9]/g, ''), 10) : 100;
                
                const href = linkElement ? linkElement.getAttribute('href') : '';
                rawUrls.push(href);
                
                const url = href ? 
                  (href.startsWith('http') ? href : 
                    `https://www.amazon.in${href.startsWith('/') ? href : '/' + href}`) : 
                  'https://www.amazon.in';
                
                const image = imageElement ? imageElement.getAttribute('src') : '/api/placeholder/60/60';
                
                results.push({
                  platform: 'Amazon',
                  name,
                  price: price ? `₹${price}` : 'Price not available',
                  rating,
                  reviews,
                  url,
                  image
                });
              }
            } catch (err) {
              console.log(`Error processing Amazon product ${i}: ${err.message}`);
            }
          }
          
          return { results, rawUrls };
        } catch (evalError) {
          console.error(`Amazon evaluation error: ${evalError.message}`);
          return { results: [], rawUrls: [] };
        }
      });
      
      // Log the raw URLs for debugging
      logger.info(`Raw URLs from Amazon: ${JSON.stringify(result.rawUrls)}`);
      
      logger.info(`Extracted ${result.results.length} products from Amazon`);
      return result.results;
    } catch (evalError) {
      logger.error(`Amazon evaluation error: ${evalError.message}`);
      return [];
    }
    
  } catch (error) {
    logger.error(`Error scraping Amazon: ${error.message}`);
    return [];
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (closeError) {
        logger.error(`Error closing Amazon page: ${closeError.message}`);
      }
    }
  }
}

module.exports = { scrapeAmazon };