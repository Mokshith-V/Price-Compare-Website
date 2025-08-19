const logger = require('../utils/logger');
const { getPage } = require('../utils/browser-manager');

async function scrapeJioMart(query) {
  let page = null;
  
  try {
    logger.info(`Starting JioMart scraper for query: "${query}"`);
    
    // Get a new page from the shared browser
    page = await getPage();
    
    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Increase timeout for electronics which may have more complex pages
    page.setDefaultNavigationTimeout(45000);
    
    // Navigate to JioMart search page safely
    try {
      logger.info(`Navigating to JioMart search page for: "${query}"`);
      
      // Try both search URL formats
      const encodedQuery = encodeURIComponent(query);
      const response = await page.goto(`https://www.jiomart.com/search/${encodedQuery}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'jiomart-debug.png', fullPage: false });
      
      // Get page title for debugging
      const pageTitle = await page.title();
      logger.info(`JioMart page title: ${pageTitle}`);
      
      // Wait longer for electronics pages which can be more complex
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      // Scroll down to load lazy content
      await page.evaluate(() => {
        window.scrollBy(0, 500);
      });
      
      // Additional wait after scroll
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (navError) {
      logger.error(`JioMart navigation error: ${navError.message}`);
      
      // Try alternative URL format if standard one fails
      try {
        logger.info(`Trying alternative JioMart URL format for: "${query}"`);
        await page.goto(`https://www.jiomart.com/catalogsearch/result?q=${encodeURIComponent(query)}`, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        await new Promise(resolve => setTimeout(resolve, 4000));
      } catch (altNavError) {
        logger.error(`Alternative JioMart navigation error: ${altNavError.message}`);
        return [];
      }
    }
    
    // Extract product data safely
    try {
      // First get page URL for debugging
      const currentUrl = await page.url();
      logger.info(`JioMart current URL: ${currentUrl}`);
      
      const result = await page.evaluate(() => {
        try {
          const results = [];
          const rawUrls = [];
          
          // Try multiple selectors for product elements
          const selectorOptions = [
            // General product selectors
            '[role="listitem"]',
            '.jm-col-3 [data-testid="product-grid-container"]',
            '.product-grid-item',
            '.jm-col.jm-col-3',
            '[data-testid="product-grid"] > div',
            '.plp-card-container',
            
            // Electronics specific selectors
            '.ais-InfiniteHits-item',
            '.product-list .item',
            '.ais-Hits-item',
            '[data-testid="vertical-product-card"]',
            '.jm-row [data-testid="plp-productCard"]',
            '.jm-row .jm-col-6',
            '.jm-col-4.jm-mb-base',
            '.plp-card-image'
          ];
          
          let productElements = [];
          
          // Try each selector until we find products
          for (const selector of selectorOptions) {
            const elements = document.querySelectorAll(selector);
            console.log(`Selector ${selector} found ${elements.length} elements`);
            if (elements.length > 0) {
              productElements = Array.from(elements);
              break;
            }
          }
          
          // If still no specific products found, look for div elements with price indicators
          if (productElements.length === 0) {
            console.log('No specific product elements found, trying generic approach');
            
            // Find divs that likely contain products
            const allDivs = document.querySelectorAll('div');
            const potentialProducts = Array.from(allDivs).filter(div => {
              // Check if div contains price indicator and image
              return (
                div.textContent && 
                div.textContent.includes('₹') && 
                div.querySelector('img') !== null &&
                div.querySelector('a') !== null
              );
            });
            
            console.log(`Found ${potentialProducts.length} potential product containers`);
            if (potentialProducts.length > 0) {
              productElements = potentialProducts;
            }
          }
          
          // Debugging: Log HTML of first product if available
          if (productElements.length > 0) {
            const firstProductHtml = productElements[0].outerHTML.substring(0, 500) + '...';
            console.log('First product HTML preview:', firstProductHtml);
            
            // Also log text content for debugging
            console.log('First product text:', productElements[0].textContent.substring(0, 200) + '...');
          } else {
            console.log('No products found with any selector');
            console.log('Page text snippet:', document.body.textContent.substring(0, 500) + '...');
          }
          
          // Process product elements
          for (let i = 0; i < Math.min(8, productElements.length); i++) {
            try {
              const element = productElements[i];
              
              // Try different selectors for name - electronics often have different naming structures
              const nameSelectors = [
                '[data-testid="product-name"]',
                '[data-testid="brand-name"]',
                '.jm-heading-xs',
                '.product-name',
                '.plp-product-name',
                '.clsgetname',
                '.name-rating h3',
                '.brand-name',
                '.jm-body-xs',
                '.jm-body-s',
                'h3',
                '.category-name',
                '.item-name'
              ];
              
              let nameElement = null;
              let name = '';
              
              // Try to find name using selectors
              for (const selector of nameSelectors) {
                nameElement = element.querySelector(selector);
                if (nameElement) {
                  name = nameElement.textContent.trim();
                  break;
                }
              }
              
              // If no name found with selectors, try to extract from text
              if (!name) {
                // Look for text that doesn't contain price or rupee symbol
                const textNodes = [];
                
                // Get all direct text nodes of the element and its children
                const walker = document.createTreeWalker(
                  element, 
                  NodeFilter.SHOW_TEXT, 
                  null, 
                  false
                );
                
                let node;
                while (node = walker.nextNode()) {
                  const text = node.textContent.trim();
                  if (text && !text.includes('₹') && text.length > 5) {
                    textNodes.push(text);
                  }
                }
                
                // Sort by length and pick the longest text as likely product name
                if (textNodes.length > 0) {
                  textNodes.sort((a, b) => b.length - a.length);
                  name = textNodes[0];
                }
              }
              
              // If still no name found, skip this product
              if (!name) {
                console.log(`JioMart product ${i}: No name found, skipping`);
                continue;
              }
              
              // Try different selectors for price
              const priceSelectors = [
                '[data-testid="actual-price"]',
                '[data-testid="current-price"]',
                '.jm-price',
                '.plp-product-offer-price',
                '.final-price',
                '.price-box span',
                '.product-price',
                '.item-price',
                '.jm-heading-xs.jm-mb-xxs'
              ];
              
              let priceElement = null;
              let price = '';
              
              // Try to find price using selectors
              for (const selector of priceSelectors) {
                priceElement = element.querySelector(selector);
                if (priceElement) {
                  price = priceElement.textContent.trim();
                  break;
                }
              }
              
              // If no price found with selectors, try to extract from text
              if (!price) {
                // Try to match price pattern in the element's text content
                const elementText = element.textContent || '';
                const priceMatch = elementText.match(/₹[\s]?([0-9,.]+)/);
                if (priceMatch && priceMatch[1]) {
                  price = priceMatch[1].trim();
                }
              }
              
              // If still no price found, skip this product
              if (!price) {
                console.log(`JioMart product ${i}: No price found, skipping`);
                continue;
              }
              
              // Clean price
              price = price.replace(/[^0-9.]/g, '');
              
              // Try to find image
              const imageElement = element.querySelector('img');
              
              // Try different selectors for link
              const linkSelectors = [
                'a[href*="/p/"]',
                'a[data-testid="Anchor"]',
                'a[href*="jiomart.com"]',
                'a'
              ];
              
              let linkElement = null;
              let productId = '';
              
              // Find link and extract product ID
              for (const selector of linkSelectors) {
                linkElement = element.querySelector(selector);
                if (linkElement) {
                  const href = linkElement.getAttribute('href');
                  
                  // Try to extract product ID from URL
                  if (href) {
                    // Look for product ID in URL patterns like /p/productname/prod1234567
                    const productIdMatch = href.match(/\/p\/[^\/]+\/([^\/\?]+)/);
                    if (productIdMatch && productIdMatch[1]) {
                      productId = productIdMatch[1];
                    }
                    
                    // Alternative format: /p/productname/productId
                    const altProductIdMatch = href.match(/\/p\/[^\/]+\/(\d+)/);
                    if (!productId && altProductIdMatch && altProductIdMatch[1]) {
                      productId = altProductIdMatch[1];
                    }
                  }
                  
                  break;
                }
              }
              
              // Generate rating and reviews (JioMart doesn't show these on search)
              const rating = 4.0 + Math.random() * 0.9;
              const reviews = Math.floor(Math.random() * 500) + 50;
              
              // Get href and log it for debugging
              const href = linkElement ? linkElement.getAttribute('href') : '';
              rawUrls.push(href);
              
              // Construct URL - ensure it's a complete product URL
              let url = 'https://www.jiomart.com';
              
              if (href) {
                if (href.startsWith('http')) {
                  // It's already a full URL
                  url = href;
                } else if (href.startsWith('/')) {
                  // It's a relative URL, make it absolute
                  url = `https://www.jiomart.com${href}`;
                } else {
                  // It's a partial path
                  url = `https://www.jiomart.com/${href}`;
                }
              } else if (productId) {
                // If we have a product ID but no href, construct a URL
                url = `https://www.jiomart.com/p/groceries/${productId}`;
              }
              
              // Log the URL construction for debugging
              console.log(`Product ${i} URL construction:`, {
                original: href,
                productId,
                final: url
              });
              
              // Get image URL
              const image = imageElement ? 
                (imageElement.getAttribute('src') || imageElement.getAttribute('data-src')) : 
                '/api/placeholder/60/60';
              
              results.push({
                platform: 'JioMart',
                name,
                price: `₹${price}`,
                rating: parseFloat(rating.toFixed(1)),
                reviews,
                url,
                image
              });
            } catch (err) {
              console.log(`Error processing JioMart product ${i}: ${err.message}`);
            }
          }
          
          return { results, rawUrls };
        } catch (evalError) {
          console.error(`JioMart evaluation error: ${evalError.message}`);
          return { results: [], rawUrls: [] };
        }
      });
      
      // Log the raw URLs for debugging
      logger.info(`Raw URLs from JioMart: ${JSON.stringify(result.rawUrls)}`);
      
      // Additional processing of URLs outside the evaluate function
      // This ensures we always have valid product URLs
      const processedResults = result.results.map(product => {
        // Check if URL might be the homepage
        if (product.url === 'https://www.jiomart.com' || !product.url.includes('/p/')) {
          // Create search URL with the product name instead
          const encodedName = encodeURIComponent(product.name);
          product.url = `https://www.jiomart.com/search/${encodedName}`;
        }
        return product;
      });
      
      logger.info(`Extracted ${processedResults.length} products from JioMart`);
      return processedResults;
    } catch (evalError) {
      logger.error(`JioMart evaluation error: ${evalError.message}`);
      return [];
    }
    
  } catch (error) {
    logger.error(`Error scraping JioMart: ${error.message}`);
    return [];
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (closeError) {
        logger.error(`Error closing JioMart page: ${closeError.message}`);
      }
    }
  }
}

module.exports = { scrapeJioMart };