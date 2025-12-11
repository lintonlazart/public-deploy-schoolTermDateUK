// School Term Dates Finder - Main Application
// ==========================================

let schools = [];
let searchTimeout = null;

// Configuration - set to true to use encrypted data
const USE_ENCRYPTED = true; 
const KEY = "UK_SCHOOL_TERMS_2025_SECURE_KEY_V1"; 

// Decrypt data using XOR cipher
function decryptData(encryptedData) {
    try {
        // Decode from base64
        const encrypted = atob(encryptedData);
        const key = KEY;
        let decrypted = "";
        
        for (let i = 0; i < encrypted.length; i++) {
            const charCode = encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            decrypted += String.fromCharCode(charCode);
        }
        
        return decrypted;
    } catch (error) {
        console.error("Decryption failed:", error);
        throw new Error("Failed to decrypt data");
    }
}

// Load schools data
async function loadSchools() {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    
    loading.style.display = 'block';
    error.style.display = 'none';
    
    try {
        const dataFile = USE_ENCRYPTED ? './public/schools.encrypted.json' : './public/schools.json';
        const response = await fetch(dataFile);
        if (!response.ok) throw new Error('Failed to load schools data');
        
        if (USE_ENCRYPTED) {
            // Load and decrypt encrypted data
            const encryptedResponse = await response.json();
            
            if (!encryptedResponse.data) {
                throw new Error("Invalid encrypted data format");
            }
            
            const decryptedString = decryptData(encryptedResponse.data);
            schools = JSON.parse(decryptedString);
        } else {
            // Load plain JSON
            schools = await response.json();
        }
        
        loading.style.display = 'none';
        
        // Don't show schools until user searches
        document.getElementById('resultsInfo').textContent = 'Start typing to search schools...';
    } catch (err) {
        loading.style.display = 'none';
        error.style.display = 'block';
        error.textContent = 'Error loading schools data: ' + err.message;
    }
}

// Format date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    });
}

// Search schools
function searchSchools(query) {
    if (!query.trim()) {
        return [];
    }

    const lowerQuery = query.toLowerCase();
    const normalizedQuery = lowerQuery.replace(/\s+/g, ''); // Remove all spaces for postcode matching
    
    return schools.filter(school => {
        const address = school.address || {};
        const normalizedPostcode = address.postcode ? address.postcode.toLowerCase().replace(/\s+/g, '') : '';
        
        return school.name.toLowerCase().includes(lowerQuery) ||
               (normalizedPostcode && normalizedPostcode.includes(normalizedQuery)) ||
               (address.street && address.street.toLowerCase().includes(lowerQuery)) ||
               (address.locality && address.locality.toLowerCase().includes(lowerQuery)) ||
               (address.town && address.town.toLowerCase().includes(lowerQuery)) ||
               school.council.toLowerCase().includes(lowerQuery);
    });
}

// Display schools
function displaySchools(schoolsToDisplay) {
    const resultsDiv = document.getElementById('results');
    const resultsInfo = document.getElementById('resultsInfo');
    
    if (schoolsToDisplay.length === 0) {
        resultsInfo.textContent = '';
        resultsDiv.innerHTML = '';
        return;
    }

    resultsInfo.textContent = `Showing ${schoolsToDisplay.length} school${schoolsToDisplay.length !== 1 ? 's' : ''}`;

    // Limit to 50 results for performance
    const limitedSchools = schoolsToDisplay.slice(0, 50);
    if (schoolsToDisplay.length > 50) {
        resultsInfo.textContent += ` (displaying first 50)`;
    }

    resultsDiv.innerHTML = limitedSchools.map(school => {
        const address = school.address || {};
        const contact = school.contact || {};
        const terms = school.terms || {};
        const insetDates = school.insetDates || [];
        const holidays = school.holidays || [];

        // Build address string
        const addressParts = [
            address.street,
            address.locality,
            address.address3,
            address.town,
            address.county
        ].filter(Boolean);
        const fullAddress = addressParts.join(', ');

        // Build term sections
        let termsHTML = '';
        if (terms.autumn || terms.spring || terms.summer) {
            termsHTML = '<div class="section-title">📅 Term Dates</div><div class="term-grid">';
            
            ['autumn', 'spring', 'summer'].forEach(season => {
                const term = terms[season];
                if (term && term.start && term.end) {
                    const seasonName = season.charAt(0).toUpperCase() + season.slice(1);
                    termsHTML += `
                        <div class="term-card">
                            <div class="term-name">${seasonName} Term</div>
                            <div class="term-dates">
                                ${formatDate(term.start)} - ${formatDate(term.end)}
                            </div>
                            ${term.halfTerm && term.halfTerm.start && term.halfTerm.end ? `
                                <div class="term-dates" style="margin-top: 8px; opacity: 0.9;">
                                    Half Term: ${formatDate(term.halfTerm.start)} - ${formatDate(term.halfTerm.end)}
                                </div>
                            ` : ''}
                        </div>
                    `;
                }
            });
            
            termsHTML += '</div>';
        }

        // Build INSET days section
        let insetHTML = '';
        if (insetDates.length > 0) {
            insetHTML = `
                <div class="inset-section">
                    <div class="section-title">📚 INSET Days</div>
                    <div class="inset-list">
                        ${insetDates.map(date => `
                            <div class="inset-badge">${formatDate(date)}</div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Build holidays section
        let holidaysHTML = '';
        if (holidays.length > 0) {
            holidaysHTML = `
                <div class="holidays-section">
                    <div class="section-title">🏖️ Bank Holidays</div>
                    <div class="holidays-list">
                        ${holidays.map(date => `
                            <div class="holiday-badge">${formatDate(date)}</div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        return `
            <div class="school-card">
                <div class="school-header">
                    <div class="school-name">${school.name}</div>
                    <div class="school-details">
                        ${address.postcode ? `<div class="detail-item">📍 ${address.postcode}</div>` : ''}
                        <div class="detail-item">🏛️ ${school.council}</div>
                        ${contact.telephone ? `<div class="detail-item">📞 ${contact.telephone}</div>` : ''}
                        ${school.type ? `<div class="detail-item">🏫 ${school.type}</div>` : ''}
                    </div>
                    ${fullAddress ? `<div class="school-details" style="margin-top: 8px;"><div class="detail-item">📮 ${fullAddress}</div></div>` : ''}
                    ${contact.website ? `<div class="school-details" style="margin-top: 8px;"><div class="detail-item">🌐 <a href="${contact.website}" target="_blank" style="color: #667eea;">${contact.website}</a></div></div>` : ''}
                    <div style="margin-top: 15px;">
                        <a href="./calendar.html?school=${school.id}" style="display: inline-block; padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: transform 0.2s;">
                            📅 View Full Calendar
                        </a>
                    </div>
                </div>

                ${termsHTML}
                ${insetHTML}
                ${holidaysHTML}
            </div>
        `;
    }).join('');
}

// Handle search input
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const autocompleteDropdown = document.getElementById('autocompleteDropdown');
    
    if (!searchInput || !autocompleteDropdown) return;

    // Show autocomplete suggestions
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        // Clear existing timeout
        clearTimeout(searchTimeout);

        if (query.length === 0) {
            // Hide autocomplete and clear results
            autocompleteDropdown.classList.remove('show');
            displaySchools([]);
            document.getElementById('resultsInfo').textContent = 'Start typing to search schools...';
            return;
        }

        // Show autocomplete suggestions immediately
        if (query.length >= 2) {
            showAutocompleteSuggestions(query);
        }

        // Debounced search for main results
        searchTimeout = setTimeout(() => {
            const filtered = searchSchools(query);
            displaySchools(filtered);
        }, 300);
    });

    // Handle suggestion click
    autocompleteDropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.autocomplete-item');
        if (item) {
            const schoolName = item.dataset.name;
            searchInput.value = schoolName;
            autocompleteDropdown.classList.remove('show');
            
            // Trigger search for selected school
            const filtered = searchSchools(schoolName);
            displaySchools(filtered);
        }
    });

    // Close autocomplete when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
            autocompleteDropdown.classList.remove('show');
        }
    });

    // Close autocomplete on Escape key
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            autocompleteDropdown.classList.remove('show');
        }
    });
}

// Show autocomplete suggestions
function showAutocompleteSuggestions(query) {
    const autocompleteDropdown = document.getElementById('autocompleteDropdown');
    const filtered = searchSchools(query);
    
    if (filtered.length === 0) {
        autocompleteDropdown.innerHTML = '<div class="autocomplete-no-results">No matches found</div>';
        autocompleteDropdown.classList.add('show');
        return;
    }

    // Limit to 8 suggestions
    const suggestions = filtered.slice(0, 8);
    
    autocompleteDropdown.innerHTML = suggestions.map(school => {
        const address = school.address || {};
        const details = [
            address.town,
            address.postcode
        ].filter(Boolean).join(' • ');

        return `
            <div class="autocomplete-item" data-name="${school.name}">
                <div class="autocomplete-item-name">${school.name}</div>
                <div class="autocomplete-item-details">${details}</div>
            </div>
        `;
    }).join('');

    autocompleteDropdown.classList.add('show');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        loadSchools();
        initializeSearch();
    });
} else {
    // DOM already loaded
    loadSchools();
    initializeSearch();
}
