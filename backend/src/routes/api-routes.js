// routes/api-routes.js
const express = require('express');
const { searchProducts } = require('../controllers/search-controller');
const router = express.Router();

// Define routes
router.get('/search', searchProducts);

module.exports = router;