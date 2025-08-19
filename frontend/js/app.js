document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const newSearchButton = document.getElementById('newSearchButton');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const platformLoading = document.getElementById('platformLoading');
    const resultsSection = document.getElementById('resultsSection');
    const searchQuery = document.getElementById('searchQuery');
    const resultsTableBody = document.getElementById('resultsTableBody');
    const sortSelect = document.getElementById('sortSelect');
    const noResults = document.getElementById('noResults');
    
    // Platform filters
    const amazonFilter = document.getElementById('amazonFilter');
    const jiomartFilter = document.getElementById('jiomartFilter');
    const myntraFilter = document.getElementById('myntraFilter');
    const ajioFilter = document.getElementById('ajioFilter');
    
    // API configuration - update this with your backend URL
    const API_BASE_URL = 'http://localhost:3000/api';
    
    // Store the current results
    let currentResults = [];
    
    // Function to display search results
    function displayResults(results, filterPlatforms = true) {
        resultsTableBody.innerHTML = '';
        
        // Apply platform filtering if needed
        let filteredResults = results;
        if (filterPlatforms) {
            filteredResults = results.filter(product => {
                if (product.platform.toLowerCase() === 'amazon' && !amazonFilter.checked) return false;
                if (product.platform.toLowerCase() === 'jiomart' && !jiomartFilter.checked) return false;
                if (product.platform.toLowerCase() === 'myntra' && !myntraFilter.checked) return false;
                if (product.platform.toLowerCase() === 'ajio' && !ajioFilter.checked) return false;
                return true;
            });
        }
        
        // Sort the results if a sort option is selected
        if (sortSelect.value !== 'relevance') {
            filteredResults = sortResults(filteredResults, sortSelect.value);
        }
        
        // Show/hide no results message
        if (!filteredResults || filteredResults.length === 0) {
            resultsTableBody.innerHTML = '';
            noResults.style.display = 'block';
            return;
        }
        
        noResults.style.display = 'none';
        
        // Create rows for each product
        filteredResults.forEach(product => {
            const row = document.createElement('tr');
            
            // Create stars based on rating
            let stars = '';
            const fullStars = Math.floor(product.rating);
            const hasHalfStar = product.rating % 1 >= 0.5;
            
            for (let i = 0; i < fullStars; i++) {
                stars += '<i class="fas fa-star"></i>';
            }
            
            if (hasHalfStar) {
                stars += '<i class="fas fa-star-half-alt"></i>';
            }
            
            const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
            for (let i = 0; i < emptyStars; i++) {
                stars += '<i class="far fa-star"></i>';
            }
            
            // Create platform badge with appropriate color
            let platformClass = '';
            switch(product.platform.toLowerCase()) {
                case 'amazon': platformClass = 'platform-amazon'; break;
                case 'jiomart': platformClass = 'platform-jiomart'; break;
                case 'myntra': platformClass = 'platform-myntra'; break;
                case 'ajio': platformClass = 'platform-ajio'; break;
            }
            
            // Add error handling for images - especially for Myntra
            const imageWithFallback = `<img src="${product.image || '/api/placeholder/60/60'}" alt="${product.name}" class="product-image" onerror="this.onerror=null; this.src='/api/placeholder/60/60';">`;
            
            row.innerHTML = `
                <td>
                    <strong class="${platformClass}">${product.platform}</strong>
                </td>
                <td class="product-cell">
                    ${imageWithFallback}
                    <div class="product-info">
                        <h3>${product.name}</h3>
                    </div>
                </td>
                <td>
                    <span class="price">${product.price}</span>
                </td>
                <td>
                    <div class="rating">
                        <div class="stars">${stars}</div>
                        <span class="review-count">(${product.reviews})</span>
                    </div>
                </td>
                <td>
                    <a href="${product.url}" target="_blank" class="cta-button">View Deal</a>
                </td>
            `;
            
            resultsTableBody.appendChild(row);
        });
        
        // Add platform-specific styles
        addPlatformStyles();
    }
    
    // Function to sort results
    function sortResults(results, sortBy) {
        const sortedResults = [...results];
        
        switch(sortBy) {
            case 'price-low':
                sortedResults.sort((a, b) => {
                    const priceA = extractPrice(a.price);
                    const priceB = extractPrice(b.price);
                    return priceA - priceB;
                });
                break;
                
            case 'price-high':
                sortedResults.sort((a, b) => {
                    const priceA = extractPrice(a.price);
                    const priceB = extractPrice(b.price);
                    return priceB - priceA;
                });
                break;
                
            case 'rating':
                sortedResults.sort((a, b) => b.rating - a.rating);
                break;
        }
        
        return sortedResults;
    }
    
    // Function to extract numeric price from string (₹12,345 -> 12345)
    function extractPrice(priceStr) {
        if (!priceStr) return 0;
        const matches = priceStr.match(/[\d,]+/);
        if (matches) {
            return parseInt(matches[0].replace(/,/g, ''));
        }
        return 0;
    }
    
    // Function to add platform-specific styles
    function addPlatformStyles() {
        const style = document.getElementById('platform-styles') || document.createElement('style');
        style.id = 'platform-styles';
        style.textContent = `
            .platform-amazon { color: #FF9900; }
            .platform-jiomart { color: #0078ad; }
            .platform-myntra { color: #FF3F6C; }
            .platform-ajio { color: #2C4152; }
        `;
        document.head.appendChild(style);
    }
    
    // Function to search for products using the API
    async function searchProducts(query) {
        loadingOverlay.style.display = 'flex';
        platformLoading.style.display = 'block';
        
        // Get selected platforms
        const selectedPlatforms = [];
        if (amazonFilter.checked) selectedPlatforms.push('amazon');
        if (jiomartFilter.checked) selectedPlatforms.push('jiomart');
        if (myntraFilter.checked) selectedPlatforms.push('myntra');
        if (ajioFilter.checked) selectedPlatforms.push('ajio');
        
        try {
            // Construct the API URL with query and platform filters
            const platformParam = selectedPlatforms.length > 0 ? 
                `&platforms=${selectedPlatforms.join(',')}` : '';
            
            const response = await fetch(
                `${API_BASE_URL}/search?query=${encodeURIComponent(query)}${platformParam}`
            );
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error searching for products:', error);
            return [];
        } finally {
            // Loading overlay will be hidden after results are displayed
        }
    }
    
    // Function to update platform loading status
    function updatePlatformStatus(platform, status, isSuccess = true) {
        const platformElement = platformLoading.querySelector(`.${platform.toLowerCase()}`);
        if (platformElement) {
            const statusSpan = platformElement.querySelector('.status');
            if (statusSpan) {
                statusSpan.textContent = status;
                statusSpan.style.color = isSuccess ? '#28a745' : '#dc3545';
            }
        }
    }
    
    // Function to reset platform loading status
    function resetPlatformStatus() {
        const statusElements = platformLoading.querySelectorAll('.status');
        statusElements.forEach(element => {
            element.textContent = 'Searching...';
            element.style.color = '#6c757d';
        });
    }
    
    // Function to show error messages
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.backgroundColor = '#f8d7da';
        errorDiv.style.color = '#721c24';
        errorDiv.style.padding = '10px';
        errorDiv.style.marginBottom = '15px';
        errorDiv.style.borderRadius = '4px';
        errorDiv.textContent = message;
        
        // Insert at the top of the results section
        const resultsContainer = resultsSection.querySelector('.container');
        resultsContainer.insertBefore(errorDiv, resultsContainer.firstChild);
        
        // Remove after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
    
    // Function to perform search
    async function performSearch() {
        const query = searchInput.value.trim();
        
        if (!query) {
            alert('Please enter a product name to search');
            return;
        }
        
        try {
            // Reset status indicators before search starts
            resetPlatformStatus();
            
            // Start the search
            const results = await searchProducts(query);
            
            // Hide loading overlay
            loadingOverlay.style.display = 'none';
            platformLoading.style.display = 'none';
            
            // Store current results for filtering
            currentResults = results;
            
            // Update platform status based on results
            const platforms = ['amazon', 'jiomart', 'myntra', 'ajio'];
            platforms.forEach(platform => {
                const platformResults = results.filter(
                    r => r.platform.toLowerCase() === platform
                );
                
                if (platformResults.length > 0) {
                    updatePlatformStatus(
                        platform, 
                        `Found ${platformResults.length} products`, 
                        true
                    );
                } else {
                    updatePlatformStatus(
                        platform,
                        'No products found',
                        false
                    );
                }
            });
            
            // Display results
            searchQuery.textContent = query;
            resultsSection.style.display = 'block';
            displayResults(results);
            
            // Scroll to results
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            loadingOverlay.style.display = 'none';
            platformLoading.style.display = 'none';
            showError('An error occurred while searching. Please try again later.');
            console.error(error);
        }
    }
    
    // Debounce function for search input
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Handle search button click
    searchButton.addEventListener('click', performSearch);
    
    // Handle new search button click with clearing of previous results
    newSearchButton.addEventListener('click', () => {
        // Clear previous search results
        resultsSection.style.display = 'none';
        resultsTableBody.innerHTML = '';
        currentResults = [];
        searchInput.value = '';
        
        // Reset platform status indicators
        resetPlatformStatus();
        
        // Reset sort selection
        if (sortSelect) {
            sortSelect.value = 'relevance';
        }
        
        // Reset platform filters to checked
        if (amazonFilter) amazonFilter.checked = true;
        if (jiomartFilter) jiomartFilter.checked = true;
        if (myntraFilter) myntraFilter.checked = true;
        if (ajioFilter) ajioFilter.checked = true;
        
        // Hide the no results message if visible
        if (noResults) {
            noResults.style.display = 'none';
        }
        
        // Scroll to search section
        document.querySelector('.search-section').scrollIntoView({ behavior: 'smooth' });
        
        // Focus on search input
        setTimeout(() => {
            searchInput.focus();
        }, 500);
    });
    
    // Handle Enter key press in search input
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            searchButton.click();
        }
    });
    
    // Handle sort selection change
    sortSelect.addEventListener('change', () => {
        if (currentResults.length > 0) {
            displayResults(currentResults);
        }
    });
    
    // Handle platform filter changes
    const platformFilters = [amazonFilter, jiomartFilter, myntraFilter, ajioFilter];
    platformFilters.forEach(filter => {
        filter.addEventListener('change', () => {
            if (currentResults.length > 0) {
                displayResults(currentResults);
            }
        });
    });
    
    // Initialize platform styles
    addPlatformStyles();
});