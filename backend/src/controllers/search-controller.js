const puppeteer = require('puppeteer');
const NodeCache = require('node-cache');
const logger = require('../utils/logger');
const config = require('../config');
const { scrapeAmazon } = require('../services/amazon-scraper');
// Replace Flipkart with JioMart
const { scrapeJioMart } = require('../services/jiomart-scraper');
const { scrapeMyntra } = require('../services/myntra-scraper');
const { scrapeAjio } = require('../services/ajio-scraper');

const cache = new NodeCache({ stdTTL: config.cacheTtl });

// Return dynamic test data for debugging
function getTestData(query) {
  // Your existing getTestData implementation if any
  // ...
  return [];
}

// Search products implementation
async function searchProducts(req, res) {
  try {
    const { query, platforms = 'amazon,jiomart,myntra,ajio' } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    logger.info(`Search request received for: "${query}"`);
    
    // Check cache
    const cacheKey = `${query}-${platforms}`;
    const cachedResult = cache.get(cacheKey);
    
    if (cachedResult) {
      logger.info(`Serving cached result for: ${query}`);
      return res.json(cachedResult);
    }
    
    // Parse platform parameter to determine which scrapers to run
    const platformsList = platforms.toLowerCase().split(',');
    const scraperPromises = [];
    
    // Only run requested scrapers
    if (platformsList.includes('amazon')) {
      scraperPromises.push(
        scrapeAmazon(query).catch(err => {
          logger.error(`Amazon scraper error: ${err.message}`);
          return [];
        })
      );
    }
    
    if (platformsList.includes('jiomart')) {
      scraperPromises.push(
        scrapeJioMart(query).catch(err => {
          logger.error(`JioMart scraper error: ${err.message}`);
          return [];
        })
      );
    }
    
    if (platformsList.includes('myntra')) {
      scraperPromises.push(
        scrapeMyntra(query).catch(err => {
          logger.error(`Myntra scraper error: ${err.message}`);
          return [];
        })
      );
    }
    
    if (platformsList.includes('ajio')) {
      scraperPromises.push(
        scrapeAjio(query).catch(err => {
          logger.error(`Ajio scraper error: ${err.message}`);
          return [];
        })
      );
    }
    
    // Run all selected scrapers in parallel to improve performance
    const results = await Promise.allSettled(scraperPromises);
    
    // Extract and combine results
    let allResults = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allResults = [...allResults, ...result.value];
      } else {
        const platform = platformsList[index] || 'unknown';
        logger.error(`Scraper for ${platform} failed: ${result.reason}`);
      }
    });
    
    // If no results, use test data
    if (allResults.length === 0) {
      logger.info(`No real scraper results, using test data for: "${query}"`);
      allResults = getTestData(query);
    } else {
      // Cache results if we got real data
      cache.set(cacheKey, allResults);
      logger.info(`Cached ${allResults.length} results for: "${query}"`);
    }
    
    return res.json(allResults);
  } catch (error) {
    logger.error('Search API error:', error);
    return res.status(500).json({ error: 'An error occurred while searching for products' });
  }
}

// Stream search results (as an alternative endpoint)
async function streamSearchResults(req, res) {
  // Your existing streamSearchResults implementation if any
  // ...
}

module.exports = { searchProducts, streamSearchResults };