// Calendar JavaScript for HTML version
// =====================================

// Configuration
const USE_ENCRYPTED = true;
const ENCRYPTION_KEY = "UK_SCHOOL_TERMS_2025_SECURE_KEY_V1";

// Default colors
const DEFAULT_COLORS = {
    term: '#667eea',
    halfTerm: '#764ba2',
    holiday: '#f093fb',
    inset: '#4facfe'
};

// State
let currentSchool = null;
let allEvents = [];
let eventFilter = {
    term: true,
    halfTerm: true,
    holiday: true,
    inset: true
};
let colors = { ...DEFAULT_COLORS };
let currentView = 'list'; // 'list' or 'calendar'

// Initialize
document.addEventListener('DOMContentLoaded', init);

function init() {
    loadSettings();
    loadSchoolFromURL();
    setupEventListeners();
    applyColors();
}

// Setup event listeners
function setupEventListeners() {
    // Filter checkboxes
    document.querySelectorAll('.filter-checkbox input').forEach(checkbox => {
        checkbox.addEventListener('change', handleFilterChange);
    });

    // Color inputs
    document.querySelectorAll('.color-input').forEach(input => {
        input.addEventListener('change', handleColorChange);
    });

    // View toggle buttons
    document.getElementById('listViewBtn').addEventListener('click', () => switchView('list'));
    document.getElementById('calendarViewBtn').addEventListener('click', () => switchView('calendar'));

    // Buttons
    document.getElementById('downloadBtn').addEventListener('click', downloadCalendar);
    document.getElementById('subscribeBtn').addEventListener('click', () => openModal('subscription'));
    document.getElementById('settingsBtn').addEventListener('click', () => openModal('settings'));

    // Modal overlays
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });
}

// Load school from URL parameter
async function loadSchoolFromURL() {
    const params = new URLSearchParams(window.location.search);
    const schoolId = params.get('school');

    if (!schoolId) {
        document.getElementById('noEvents').style.display = 'block';
        document.getElementById('noEvents').innerHTML = '<p>No school selected. <a href="./index-simple.html">Go back to search</a></p>';
        return;
    }

    try {
        // Load schools data
        const dataFile = USE_ENCRYPTED ? './public/schools.encrypted.json' : './public/schools.json';
        const response = await fetch(dataFile);
        if (!response.ok) throw new Error('Failed to load schools data');

        let schools;
        if (USE_ENCRYPTED) {
            const encryptedResponse = await response.json();
            const decryptedString = decryptData(encryptedResponse.data);
            schools = JSON.parse(decryptedString);
        } else {
            schools = await response.json();
        }

        // Find the school
        currentSchool = schools.find(s => s.id === schoolId);
        if (!currentSchool) {
            throw new Error('School not found');
        }

        // Update UI
        document.getElementById('schoolName').textContent = `📅 ${currentSchool.name}`;
        document.title = `${currentSchool.name} - Calendar`;

        // Generate events
        allEvents = schoolToCalendarEvents(currentSchool);
        renderCalendar();

    } catch (error) {
        console.error('Error loading school:', error);
        document.getElementById('noEvents').style.display = 'block';
        document.getElementById('noEvents').innerHTML = `<p>Error loading school data. <a href="./index-simple.html">Go back</a></p>`;
    }
}

// Decrypt data using XOR cipher
function decryptData(encryptedData) {
    try {
        const encrypted = atob(encryptedData);
        const key = ENCRYPTION_KEY;
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

// Convert school data to calendar events
function schoolToCalendarEvents(school) {
    const events = [];

    // Term dates
    if (school.terms) {
        Object.entries(school.terms).forEach(([season, termDates]) => {
            if (termDates && termDates.start && termDates.end) {
                // Full term
                events.push({
                    id: `${school.id}-${season}-term`,
                    title: `${school.name} - ${capitalize(season)} Term`,
                    start: new Date(termDates.start),
                    end: new Date(termDates.end),
                    type: 'term',
                    schoolId: school.id,
                    schoolName: school.name
                });

                // Half term
                if (termDates.halfTerm && termDates.halfTerm.start && termDates.halfTerm.end) {
                    events.push({
                        id: `${school.id}-${season}-halfterm`,
                        title: `${school.name} - ${capitalize(season)} Half Term`,
                        start: new Date(termDates.halfTerm.start),
                        end: new Date(termDates.halfTerm.end),
                        type: 'halfTerm',
                        schoolId: school.id,
                        schoolName: school.name
                    });
                }
            }
        });
    }

    // INSET days
    if (school.insetDates) {
        school.insetDates.forEach((date, index) => {
            events.push({
                id: `${school.id}-inset-${index}`,
                title: `${school.name} - INSET Day`,
                start: new Date(date),
                end: new Date(date),
                type: 'inset',
                schoolId: school.id,
                schoolName: school.name
            });
        });
    }

    // Bank holidays
    if (school.holidays) {
        school.holidays.forEach((date, index) => {
            events.push({
                id: `${school.id}-holiday-${index}`,
                title: `Bank Holiday`,
                start: new Date(date),
                end: new Date(date),
                type: 'holiday',
                schoolId: school.id,
                schoolName: school.name
            });
        });
    }

    return events;
}

// Render calendar
function renderCalendar() {
    if (currentView === 'list') {
        renderListView();
    } else {
        renderVisualCalendar();
    }
}

// Render list view
function renderListView() {
    const filteredEvents = allEvents.filter(event => eventFilter[event.type]);
    
    if (filteredEvents.length === 0) {
        document.getElementById('calendarGrid').style.display = 'none';
        document.getElementById('noEvents').style.display = 'block';
        return;
    }

    document.getElementById('calendarGrid').style.display = 'grid';
    document.getElementById('noEvents').style.display = 'none';

    // Group by month
    const eventsByMonth = groupEventsByMonth(filteredEvents);
    const sortedMonths = Array.from(eventsByMonth.keys()).sort();

    // Render months
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = sortedMonths.map(monthKey => {
        const events = eventsByMonth.get(monthKey);
        return `
            <div class="month-card">
                <div class="month-header">${formatMonthHeader(monthKey)}</div>
                <div class="events-list">
                    ${events.map(event => `
                        <div class="event-item" style="border-left-color: ${colors[event.type]}">
                            <div class="event-title">${escapeHtml(event.title)}</div>
                            <div class="event-date">${formatEventDate(event)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// Group events by month
function groupEventsByMonth(events) {
    const grouped = new Map();

    events.forEach(event => {
        const monthKey = `${event.start.getFullYear()}-${String(event.start.getMonth() + 1).padStart(2, '0')}`;
        if (!grouped.has(monthKey)) {
            grouped.set(monthKey, []);
        }
        grouped.get(monthKey).push(event);
    });

    // Sort events within each month
    grouped.forEach((events, key) => {
        events.sort((a, b) => a.start.getTime() - b.start.getTime());
    });

    return grouped;
}

// Handle filter change
function handleFilterChange(e) {
    const type = e.target.dataset.type;
    const checked = e.target.checked;
    
    eventFilter[type] = checked;
    
    // Update checkbox appearance
    const label = e.target.closest('.filter-checkbox');
    if (checked) {
        label.classList.add('active');
    } else {
        label.classList.remove('active');
    }
    
    saveSettings();
    renderCalendar();
}

// Handle color change
function handleColorChange(e) {
    const type = e.target.id.replace('colorInput', '').toLowerCase().replace('halfterm', 'halfTerm');
    colors[type] = e.target.value;
    
    applyColors();
    saveSettings();
    renderCalendar();
}

// Apply colors to indicators
function applyColors() {
    document.getElementById('color-term').style.backgroundColor = colors.term;
    document.getElementById('color-halfTerm').style.backgroundColor = colors.halfTerm;
    document.getElementById('color-holiday').style.backgroundColor = colors.holiday;
    document.getElementById('color-inset').style.backgroundColor = colors.inset;
    
    document.getElementById('colorInputTerm').value = colors.term;
    document.getElementById('colorInputHalfTerm').value = colors.halfTerm;
    document.getElementById('colorInputHoliday').value = colors.holiday;
    document.getElementById('colorInputInset').value = colors.inset;
}

// Reset colors to default
function resetColors() {
    colors = { ...DEFAULT_COLORS };
    applyColors();
    saveSettings();
    renderCalendar();
}

// Download calendar as ICS
function downloadCalendar() {
    if (!currentSchool) return;
    
    const filteredEvents = allEvents.filter(event => eventFilter[event.type]);
    const icsContent = generateICS(filteredEvents, currentSchool.name);
    const filename = `${currentSchool.name.replace(/\s+/g, '-')}-calendar.ics`;
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

// Generate ICS file content
function generateICS(events, schoolName) {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//UK School Terms//Calendar//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${schoolName} - School Calendar`,
        'X-WR-TIMEZONE:Europe/London'
    ];

    events.forEach(event => {
        const startDate = formatICSDate(event.start);
        const endDate = formatICSDate(new Date(event.end.getTime() + 86400000));
        const uid = `${event.id}@schoolterms.uk`;
        const timestamp = formatICSDate(new Date());

        lines.push(
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${timestamp}`,
            `DTSTART;VALUE=DATE:${startDate}`,
            `DTEND;VALUE=DATE:${endDate}`,
            `SUMMARY:${escapeICS(event.title)}`,
            `DESCRIPTION:${escapeICS(getEventDescription(event.type))}`,
            'STATUS:CONFIRMED',
            'TRANSP:TRANSPARENT',
            'END:VEVENT'
        );
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
}

// Handle subscription
function handleSubscribe(e) {
    e.preventDefault();
    downloadCalendar();
    setTimeout(() => {
        alert('Calendar downloaded! Import it into your email calendar app (Gmail, Outlook, Apple Calendar, etc.) to subscribe to updates.');
        closeModal('subscription');
    }, 100);
}

// Modal functions
function openModal(type) {
    document.getElementById(`${type}Modal`).classList.add('active');
}

function closeModal(type) {
    document.getElementById(`${type}Modal`).classList.remove('active');
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('calendar-colors', JSON.stringify(colors));
    localStorage.setItem('calendar-filter', JSON.stringify(eventFilter));
}

// Load settings from localStorage
function loadSettings() {
    const savedColors = localStorage.getItem('calendar-colors');
    if (savedColors) {
        colors = JSON.parse(savedColors);
    }
    
    const savedFilter = localStorage.getItem('calendar-filter');
    if (savedFilter) {
        eventFilter = JSON.parse(savedFilter);
        
        // Update checkboxes
        Object.entries(eventFilter).forEach(([type, checked]) => {
            const checkbox = document.querySelector(`input[data-type="${type}"]`);
            if (checkbox) {
                checkbox.checked = checked;
                const label = checkbox.closest('.filter-checkbox');
                if (checked) {
                    label.classList.add('active');
                } else {
                    label.classList.remove('active');
                }
            }
        });
    }

    // Load saved view preference
    const savedView = localStorage.getItem('calendar-view');
    if (savedView && (savedView === 'list' || savedView === 'calendar')) {
        currentView = savedView;
        // Update button states
        document.getElementById('listViewBtn').classList.toggle('active', savedView === 'list');
        document.getElementById('calendarViewBtn').classList.toggle('active', savedView === 'calendar');
    }
}

// Utility functions
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatEventDate(event) {
    const start = event.start.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    });
    
    if (event.start.getTime() === event.end.getTime()) {
        return start;
    }
    
    const end = event.end.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    });
    
    return `${start} → ${end}`;
}

function formatMonthHeader(monthKey) {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function formatICSDate(date) {
    return date.toISOString().replace(/[-:]/g, '').split('T')[0];
}

function escapeICS(text) {
    return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getEventDescription(type) {
    const descriptions = {
        term: 'School term dates',
        halfTerm: 'Half term break',
        holiday: 'Bank holiday',
        inset: 'INSET day - school closed for staff training'
    };
    return descriptions[type];
}

// Switch between list and calendar view
function switchView(view) {
    currentView = view;
    
    // Update buttons
    document.getElementById('listViewBtn').classList.toggle('active', view === 'list');
    document.getElementById('calendarViewBtn').classList.toggle('active', view === 'calendar');
    
    // Update views
    document.getElementById('listView').classList.toggle('active', view === 'list');
    document.getElementById('calendarView').classList.toggle('active', view === 'calendar');
    
    // Show/hide legend
    document.getElementById('calendarLegend').style.display = view === 'calendar' ? 'block' : 'none';
    
    // Update legend colors
    if (view === 'calendar') {
        document.getElementById('legend-term').style.backgroundColor = colors.term;
        document.getElementById('legend-halfTerm').style.backgroundColor = colors.halfTerm;
        document.getElementById('legend-holiday').style.backgroundColor = colors.holiday;
        document.getElementById('legend-inset').style.backgroundColor = colors.inset;
    }
    
    // Render appropriate view
    if (view === 'calendar') {
        renderVisualCalendar();
    }
    
    localStorage.setItem('calendar-view', view);
}

// Render visual calendar with blocked dates
function renderVisualCalendar() {
    const filteredEvents = allEvents.filter(event => eventFilter[event.type]);
    
    if (filteredEvents.length === 0) {
        document.getElementById('visualCalendar').innerHTML = '';
        document.getElementById('noEvents').style.display = 'block';
        return;
    }
    
    document.getElementById('noEvents').style.display = 'none';
    
    // Find date range
    const allDates = filteredEvents.flatMap(e => [e.start, e.end]);
    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));
    
    // Generate months
    const months = [];
    const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    
    while (current <= end) {
        months.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
    }
    
    // Render each month
    const visualCalendar = document.getElementById('visualCalendar');
    visualCalendar.innerHTML = months.map(month => renderMonth(month, filteredEvents)).join('');
}

// Render a single month calendar
function renderMonth(monthDate, events) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const monthName = monthDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    
    // Get first and last day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get day of week for first day (0 = Sunday, convert to Monday = 0)
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1; // Convert to Monday = 0
    
    const daysInMonth = lastDay.getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Generate days array
    const days = [];
    
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
        days.push({
            day: prevMonthLastDay - i,
            isCurrentMonth: false,
            date: new Date(year, month - 1, prevMonthLastDay - i)
        });
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        days.push({
            day: day,
            isCurrentMonth: true,
            date: new Date(year, month, day)
        });
    }
    
    // Next month days
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let day = 1; day <= remainingDays; day++) {
        days.push({
            day: day,
            isCurrentMonth: false,
            date: new Date(year, month + 1, day)
        });
    }
    
    // Render calendar
    return `
        <div class="calendar-month">
            <div class="calendar-month-header">
                <div class="calendar-month-title">${monthName}</div>
            </div>
            <div class="calendar-weekdays">
                <div class="calendar-weekday">Mon</div>
                <div class="calendar-weekday">Tue</div>
                <div class="calendar-weekday">Wed</div>
                <div class="calendar-weekday">Thu</div>
                <div class="calendar-weekday">Fri</div>
                <div class="calendar-weekday">Sat</div>
                <div class="calendar-weekday">Sun</div>
            </div>
            <div class="calendar-days">
                ${days.map(dayInfo => renderDay(dayInfo, events, today)).join('')}
            </div>
        </div>
    `;
}

// Render a single day
function renderDay(dayInfo, events, today) {
    const dayEvents = getDayEvents(dayInfo.date, events);
    const isToday = dayInfo.date.getTime() === today.getTime();
    
    const classes = ['calendar-day'];
    if (!dayInfo.isCurrentMonth) classes.push('other-month');
    if (isToday) classes.push('today');
    if (dayEvents.length > 0) classes.push('has-events');
    
    // Get unique event types for this day
    const eventTypes = [...new Set(dayEvents.map(e => e.type))];
    
    // Get background color (use first event type)
    const bgColor = dayEvents.length > 0 ? colors[dayEvents[0].type] : 'transparent';
    
    // Create tooltip
    const tooltipText = dayEvents.length > 0 
        ? dayEvents.map(e => e.title).join('<br>')
        : '';
    
    return `
        <div class="${classes.join(' ')}">
            ${dayEvents.length > 0 ? `<div class="calendar-day-bg" style="background-color: ${bgColor};"></div>` : ''}
            <div class="calendar-day-number">${dayInfo.day}</div>
            ${eventTypes.length > 0 ? `
                <div class="calendar-day-dots">
                    ${eventTypes.slice(0, 3).map(type => 
                        `<div class="event-dot" style="background-color: ${colors[type]};"></div>`
                    ).join('')}
                </div>
            ` : ''}
            ${tooltipText ? `<div class="day-tooltip">${tooltipText}</div>` : ''}
        </div>
    `;
}

// Get events for a specific day
function getDayEvents(date, events) {
    const dateTime = date.getTime();
    return events.filter(event => {
        const startTime = new Date(event.start.getFullYear(), event.start.getMonth(), event.start.getDate()).getTime();
        const endTime = new Date(event.end.getFullYear(), event.end.getMonth(), event.end.getDate()).getTime();
        return dateTime >= startTime && dateTime <= endTime;
    });
}
