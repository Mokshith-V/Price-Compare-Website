const logger = require('../utils/logger');
const { getPage } = require('../utils/browser-manager');

async function scrapeFlipkart(query) {
  let page = null;
  
  try {
    logger.info(`Starting Flipkart scraper for query: "${query}"`);
    
    // Get a new page from the shared browser
    page = await getPage();
    
    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Increase timeout
    page.setDefaultNavigationTimeout(30000);
    
    // Navigate to Flipkart search page safely
    try {
      logger.info(`Navigating to Flipkart search page for: "${query}"`);
      const response = await page.goto(`https://www.flipkart.com/search?q=${encodeURIComponent(query)}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Safe wait
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (navError) {
      logger.error(`Flipkart navigation error: ${navError.message}`);
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
            '._1AtVbE ._13oc-S',
            '._1YokD2 ._3pLy-c',
            '._4ddWXP',
            '._1xHGtK',
            '.CXW8mj',
            '.s1Q9rs',
            '._2kHMtA'
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
              const nameSelectors = [
                '._4rR01T', 
                '.s1Q9rs', 
                '.IRpwTa', 
                '._2WkVRV'
              ];
              
              let nameElement = null;
              for (const selector of nameSelectors) {
                nameElement = element.querySelector(selector);
                if (nameElement) break;
              }
              
              // Try different selectors for price
              const priceSelectors = [
                '._30jeq3', 
                '._1_WHN1'
              ];
              
              let priceElement = null;
              for (const selector of priceSelectors) {
                priceElement = element.querySelector(selector);
                if (priceElement) break;
              }
              
              // Skip empty or "Need help?" entries
              if (!nameElement || 
                  !nameElement.textContent || 
                  nameElement.textContent.trim().toLowerCase().includes('need help')) {
                continue;
              }
              
              const name = nameElement.textContent.trim();
              
              // Extract price
              let price = '0';
              if (priceElement) {
                const priceText = priceElement.textContent.trim();
                const priceMatch = priceText.match(/₹([\d,]+)/);
                price = priceMatch ? priceMatch[1].replace(/,/g, '') : '0';
              }
              
              // Extract other details
              const ratingElement = element.querySelector('._3LWZlK');
              const reviewCountElement = element.querySelector('._2_R_DZ');
              
              // Try different selectors for link
              const linkSelectors = [
                'a[href*="/p/"]', 
                '._2rpwqI',
                'a.IRpwTa', 
                'a.s1Q9rs', 
                'a'
              ];
              
              let linkElement = null;
              for (const selector of linkSelectors) {
                linkElement = element.querySelector(selector);
                if (linkElement) break;
              }
              
              const imageElement = element.querySelector('img');
              
              const rating = ratingElement ? 
                parseFloat(ratingElement.textContent.trim()) : 
                null;
              
              let reviews = 0;
              if (reviewCountElement) {
                const reviewMatch = reviewCountElement.textContent.match(/(\d+)/);
                reviews = reviewMatch ? parseInt(reviewMatch[1], 10) : 0;
              }
              
              // Process URL
              const href = linkElement ? linkElement.getAttribute('href') : '';
              rawUrls.push(href);
              
              const url = href ? 
                (href.startsWith('http') ? href : 
                 `https://www.flipkart.com${href.startsWith('/') ? href : '/' + href}`) : 
                'https://www.flipkart.com';
              
              // Get image URL - try multiple attributes for lazy loading
              let image = '/api/placeholder/60/60';
              if (imageElement) {
                image = imageElement.getAttribute('src') || 
                        imageElement.getAttribute('data-src') || 
                        '/api/placeholder/60/60';
              }
              
              results.push({
                platform: 'Flipkart',
                name,
                price: `₹${price}`,
                rating: rating !== null ? rating : 4.0,
                reviews: reviews || 100,
                url,
                image
              });
            } catch (err) {
              console.log(`Error processing Flipkart product ${i}: ${err.message}`);
            }
          }
          
          return { results, rawUrls };
        } catch (evalError) {
          console.error(`Flipkart evaluation error: ${evalError.message}`);
          return { results: [], rawUrls: [] };
        }
      });
      
      // Log the raw URLs for debugging
      logger.info(`Raw URLs from Flipkart: ${JSON.stringify(result.rawUrls)}`);
      
      logger.info(`Extracted ${result.results.length} products from Flipkart`);
      return result.results;
    } catch (evalError) {
      logger.error(`Flipkart evaluation error: ${evalError.message}`);
      return [];
    }
    
  } catch (error) {
    logger.error(`Error scraping Flipkart: ${error.message}`);
    return [];
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (closeError) {
        logger.error(`Error closing Flipkart page: ${closeError.message}`);
      }
    }
  }
}

module.exports = { scrapeFlipkart };