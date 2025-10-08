document.addEventListener('DOMContentLoaded', () => {
    const GOOGLE_CLIENT_ID = '16129359964-5l1olas9egpamj181gnr6goll0vudctc.apps.googleusercontent.com';
    let toolsData = [];
    const mainContentWrapper = document.getElementById('main-content-wrapper');
    const mainHeader = document.querySelector('.main-header');
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const mainNav = document.getElementById('main-nav');
    const navLinks = mainNav.querySelectorAll('a[data-view]');
    const footerLinks = document.querySelectorAll('.footer-links-bottom a[data-view]');
    const logoLink = document.querySelector('.logo');
    const signInModal = document.getElementById('signInModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const popularGrid = document.getElementById('popular-tools-grid');
    const newGrid = document.getElementById('new-tools-grid');
    const toolViewerContainer = document.getElementById('tool-viewer-container');
    const categoryToolsView = document.getElementById('category-tools-view');
    const allPageSections = document.querySelectorAll('.page-section');
    const categoriesView = document.getElementById('categories-view');
    const yourToolsView = document.getElementById('your-tools-view');
    const yourWorkView = document.getElementById('your-work-view');
    const profileView = document.getElementById('profile-view'); // New
    const searchInput = document.getElementById('searchInput');
    const searchResultsView = document.getElementById('search-results-view');
    const searchResultsGrid = document.getElementById('search-results-grid');
    const searchResultsHeading = document.getElementById('search-results-heading');
    const popularToolsSection = document.getElementById('popular-tools-section');
    const newToolsSection = document.getElementById('new-tools-section');
    const alarmSound = document.getElementById('alarm-sound');
    let currentView = 'home';
    let previousView = 'home';
    let calendarDisplayDate = new Date();
    let bookmarks = JSON.parse(localStorage.getItem('toolHubBookmarks')) || [];
    let recentlyUsed = JSON.parse(localStorage.getItem('toolHubRecent')) || [];
    let activeAlarms = {};
    const GUEST_BOOKMARK_LIMIT = 20;
    const RECENTLY_USED_LIMIT = 100;
    let lastScrollTop = 0;
    const profileLink = document.getElementById('profile-link');
    const profileSignInModal = document.getElementById('profileSignInModal');
    const profileModalCloseBtn = document.getElementById('profileModalCloseBtn');
    let userProfile = null;
    let userPreferences = {}; // New
    const sanitizeHTML = (str) => { if (!str) return ''; const temp = document.createElement('div'); temp.textContent = str; return temp.innerHTML; };
    const unlockAudio = () => { alarmSound.play().catch(() => {}); alarmSound.pause(); alarmSound.currentTime = 0; };
    document.body.addEventListener('click', unlockAudio, { once: true });
    const saveBookmarks = () => localStorage.setItem('toolHubBookmarks', JSON.stringify(bookmarks));
    const saveRecentlyUsed = () => localStorage.setItem('toolHubRecent', JSON.stringify(recentlyUsed));
    const saveAlarms = () => localStorage.setItem('toolHubAlarms', JSON.stringify(activeAlarms));
    const saveUserPreferences = () => localStorage.setItem('toolHubUserPreferences', JSON.stringify(userPreferences)); // New

    function decodeJwtResponse(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error("Error decoding JWT", error);
            return null;
        }
    }

    function handleCredentialResponse(response) {
        userProfile = decodeJwtResponse(response.credential);
        if (userProfile) {
            localStorage.setItem('toolHubUserProfile', JSON.stringify(userProfile));
            loadUserPreferences(); // New
            updateUIForLogin();
            profileSignInModal.classList.remove('show');
            alert(`Welcome, ${userProfile.given_name}!`);
        }
    }
    
    // New: Function to load user preferences from localStorage
    function loadUserPreferences() {
        userPreferences = JSON.parse(localStorage.getItem('toolHubUserPreferences')) || {
            notifications: true,
            birthday: ''
        };
    }
    
    function updateUIForLogin() {
        if (!userProfile) return;
        profileLink.innerHTML = `<img src="${userProfile.picture}" alt="User profile picture"> ${sanitizeHTML(userProfile.given_name)}`;
        profileLink.title = `Signed in as ${userProfile.name}. Click to view profile.`;
        profileLink.classList.add('logged-in');
    }

    function updateUIForLogout() {
        userProfile = null;
        userPreferences = {}; // New
        localStorage.removeItem('toolHubUserProfile');
        localStorage.removeItem('toolHubUserPreferences'); // New
        profileLink.innerHTML = `<i class="fas fa-user-circle"></i> Profile`;
        profileLink.title = '';
        profileLink.classList.remove('logged-in');
    }

    function signOut() {
        if (window.google && google.accounts.id) {
            google.accounts.id.disableAutoSelect();
        }
        updateUIForLogout();
        switchView('home'); // Redirect to home after signing out
        alert("You have been signed out.");
    }

    window.onload = function () {
        if (typeof google === 'undefined') {
            console.warn("Google Identity Services script not loaded.");
            return;
        }
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse
        });
        google.accounts.id.renderButton(
            document.getElementById("g_id_signin"),
            { theme: "outline", size: "large", width: "280" }
        );
    };
    
    const getNextOccurrence = (currentDate, frequency, originalStartTime) => {
        let next = new Date(currentDate);
        const originalDay = new Date(originalStartTime).getDate();
        switch (frequency) {
            case 'daily': next.setDate(next.getDate() + 1); break;
            case 'weekly': next.setDate(next.getDate() + 7); break;
            case 'monthly': next.setMonth(next.getMonth() + 1); if (next.getDate() !== originalDay) { next.setDate(0); } break;
            case 'yearly': next.setFullYear(next.getFullYear() + 1); break;
            default: return null;
        }
        return next;
    };

    const updateYourWorkBadge = () => {
        const badge = document.getElementById('your-work-badge');
        if (!badge) return;
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
        let todayRemindersCount = 0;
        Object.values(activeAlarms).forEach(alarm => {
            if (alarm.triggered && alarm.frequency === 'one-time') return;
            const alarmStartDate = new Date(alarm.startTime);
            if (alarmStartDate > todayEnd) return;
            if (alarm.frequency === 'one-time') {
                if (alarm.nextOccurrence >= todayStart.getTime() && alarm.nextOccurrence < todayEnd.getTime()) { todayRemindersCount++; }
            } else {
                let occurrence = new Date(alarm.startTime);
                if (occurrence < todayStart) {
                    switch (alarm.frequency) {
                        case 'daily': occurrence = new Date(todayStart.getTime()); occurrence.setHours(alarmStartDate.getHours(), alarmStartDate.getMinutes(), alarmStartDate.getSeconds()); break;
                        case 'weekly': const daysUntil = (alarmStartDate.getDay() - todayStart.getDay() + 7) % 7; occurrence = new Date(todayStart.getTime() + daysUntil * 24 * 60 * 60 * 1000); occurrence.setHours(alarmStartDate.getHours(), alarmStartDate.getMinutes(), alarmStartDate.getSeconds()); break;
                        case 'monthly': occurrence = new Date(todayStart); occurrence.setDate(alarmStartDate.getDate()); occurrence.setHours(alarmStartDate.getHours(), alarmStartDate.getMinutes(), alarmStartDate.getSeconds()); if(occurrence < todayStart) occurrence.setMonth(occurrence.getMonth()+1); break;
                        case 'yearly': occurrence = new Date(todayStart.getFullYear(), alarmStartDate.getMonth(), alarmStartDate.getDate()); occurrence.setHours(alarmStartDate.getHours(), alarmStartDate.getMinutes(), alarmStartDate.getSeconds()); if (occurrence < todayStart) occurrence.setFullYear(occurrence.getFullYear() + 1); break;
                    }
                }
                if (occurrence.getTime() >= todayStart.getTime() && occurrence.getTime() < todayEnd.getTime()) { todayRemindersCount++; }
            }
        });
        badge.textContent = todayRemindersCount > 0 ? todayRemindersCount : '';
    };
    const isBookmarked = (toolId) => bookmarks.includes(toolId);
    const addRecentTool = (toolId) => {
        recentlyUsed = recentlyUsed.filter(item => item.id !== toolId);
        recentlyUsed.unshift({ id: toolId, timestamp: Date.now() });
        if (recentlyUsed.length > RECENTLY_USED_LIMIT) { recentlyUsed.pop(); }
        saveRecentlyUsed();
    };
    const createToolCardHTML = (tool, isYourToolsView = false) => {
        const bookmarkedClass = isBookmarked(tool.id) ? 'bookmarked' : '';
        const hasAlarm = isYourToolsView && Object.values(activeAlarms).some(alarm => alarm.toolId === tool.id && !alarm.triggered);
        const alarmIconHTML = hasAlarm ? `<i class="fas fa-bell" style="color: #f59e0b; margin-left: 8px;" title="Alarm is set for this tool" aria-label="Alarm is set"></i>` : '';
        return `<div class="tool-card" data-tool-id="${tool.id}"><h3 class="tool-title">${sanitizeHTML(tool.Name)}${alarmIconHTML}</h3><div class="tool-actions-bar"><a href="/tool/${tool.id}" class="action-btn btn-open" data-tool-id="${tool.id}" data-tool-name="${tool.Name}">Open</a><button class="action-btn btn-bookmark ${bookmarkedClass}" data-tool-id="${tool.id}" aria-label="Bookmark tool"><i class="fas fa-bookmark"></i></button><button class="action-btn btn-share" data-tool-id="${tool.id}" data-tool-title="${tool.Name}" aria-label="Share tool"><i class="fas fa-share-alt"></i></button></div></div>`;
    };
    
    const renderTools = (container, tools, injectAds = false, emptyMessage = "", isYourToolsView = false) => {
        if (!container) return;
        if (tools.length === 0) {
            if (emptyMessage) container.innerHTML = `<div class="empty-state-message">${emptyMessage}</div>`;
            return;
        }
        let htmlElements = tools.map(tool => createToolCardHTML(tool, isYourToolsView));
        container.innerHTML = htmlElements.join('');
    };

    const renderCategoriesView = () => { const categories = [...new Set(toolsData.map(tool => tool.Category))].sort(); categoriesView.innerHTML = `<div class="container"><h2><i class="fas fa-list" style="color:#6366f1;"></i> All Categories</h2><div class="category-grid">${categories.map(cat => `<div class="category-card" data-category-name="${sanitizeHTML(cat)}">${sanitizeHTML(cat)}</div>`).join('')}</div></div>`; };
    const renderYourToolsView = () => { const bookmarkedTools = toolsData.filter(tool => bookmarks.includes(tool.id)); const gridId = 'your-tools-grid'; yourToolsView.innerHTML = `<div class="container"><h2><i class="fas fa-bookmark" style="color:#ef4444;"></i> My Tools</h2><div class="tool-grid" id="${gridId}"></div></div>`; renderTools(document.getElementById(gridId), bookmarkedTools, false, 'You have no bookmarked tools yet.', true); };
    const renderCategoryToolsView = (categoryName) => { const filteredTools = toolsData.filter(tool => tool.Category === categoryName); const gridId = 'category-tools-grid'; categoryToolsView.innerHTML = `<div class="container"><div class="sub-view-header"><button id="back-to-categories-btn" class="btn-back"><i class="fas fa-arrow-left"></i></button><h2>${sanitizeHTML(categoryName)} Tools</h2></div><div class="tool-grid" id="${gridId}"></div></div>`; renderTools(document.getElementById(gridId), filteredTools, false); };
    const renderYourWorkView = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfView = new Date(calendarDisplayDate);
        startOfView.setDate(calendarDisplayDate.getDate() - 2); 
        startOfView.setHours(0, 0, 0, 0);
        const endOfView = new Date(startOfView);
        endOfView.setDate(startOfView.getDate() + 5);
        endOfView.setSeconds(endOfView.getSeconds() - 1);
        const endRangeDate = new Date(startOfView);
        endRangeDate.setDate(startOfView.getDate() + 4);
        const formatRange = (start, end) => { const options = { month: 'short', day: 'numeric' }; return `${start.toLocaleDateString(undefined, options)} - ${end.toLocaleDateString(undefined, {...options, year: 'numeric'})}`; }
        const allEvents = [];
        Object.entries(activeAlarms).forEach(([alarmId, alarm]) => {
            if (alarm.triggered && alarm.frequency === 'one-time') return;
            let occurrence = new Date(alarm.startTime);
            const searchStart = new Date(startOfView.getTime() - 31 * 24*60*60*1000);
            if (occurrence > endOfView) return;
            if (occurrence < searchStart && alarm.frequency !== 'one-time') {
                 while(occurrence < searchStart) {
                    const nextOccurrence = getNextOccurrence(occurrence, alarm.frequency, alarm.startTime);
                    if (!nextOccurrence || nextOccurrence <= occurrence) break;
                    occurrence = nextOccurrence;
                }
            }
            while (occurrence <= endOfView) {
                if (occurrence >= startOfView) { allEvents.push({ alarmId, date: new Date(occurrence), name: alarm.toolName, toolId: alarm.toolId, isCompleted: occurrence.getTime() < now.getTime() }); }
                if (alarm.frequency === 'one-time') break;
                const nextOccurrence = getNextOccurrence(occurrence, alarm.frequency, alarm.startTime);
                if (!nextOccurrence || nextOccurrence <= occurrence) break; 
                occurrence = nextOccurrence;
            }
        });
        let calendarHtml = '';
        for (let i = 0; i < 5; i++) {
            const day = new Date(startOfView);
            day.setDate(startOfView.getDate() + i);
            const dayDate = day.getDate();
            const dayName = day.toLocaleDateString(undefined, { weekday: 'short' });
            const fullDateStr = day.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const isTodayClass = day.getTime() === today.getTime() ? 'is-today' : '';
            const isActiveDateClass = day.getTime() === new Date(calendarDisplayDate.getFullYear(), calendarDisplayDate.getMonth(), calendarDisplayDate.getDate()).getTime() ? 'is-active-date' : '';
            const eventsForDay = allEvents.filter(event => event.date.getFullYear() === day.getFullYear() && event.date.getMonth() === day.getMonth() && event.date.getDate() === day.getDate()).sort((a,b) => a.date - b.date);
            const isEmptyClass = eventsForDay.length === 0 ? 'is-empty' : '';
            let eventsHtml = eventsForDay.map(event => `<div class="calendar-event ${event.isCompleted ? 'is-completed' : ''}" data-tool-id="${event.toolId}" data-tool-name="${event.name}" title="${sanitizeHTML(event.name)}"><span class="event-text-wrapper">${sanitizeHTML(event.name)}</span><button class="delete-event-btn" data-alarm-id="${event.alarmId}">&times;</button></div>`).join('');
            calendarHtml += `<div class="calendar-day ${isTodayClass} ${isActiveDateClass} ${isEmptyClass}"><div class="mobile-event-sidebar"><span>My Work (task)</span></div><div class="mobile-event-main-content"><div class="calendar-day-full-date">${fullDateStr}</div><div class="calendar-day-header"><span class="day-name">${dayName}</span><span class="day-number">${dayDate}</span></div><div class="calendar-events-container">${eventsHtml}</div></div></div>`;
        }
        yourWorkView.innerHTML = `<div class="container"><h2><i class="fas fa-briefcase" style="color:#7c3aed;"></i> My Work</h2><div class="your-work-controls"><button id="calendar-today-btn">Today</button><button id="calendar-prev-btn"><i class="fas fa-chevron-left"></i></button><button id="calendar-next-btn"><i class="fas fa-chevron-right"></i></button><span class="your-work-date-range">${formatRange(startOfView, endRangeDate)}</span></div><div class="calendar-container"><div class="calendar-grid">${calendarHtml}</div></div></div>`;
    };

    // New: Function to render the profile page
    const renderProfileView = () => {
        if (!userProfile) {
            profileSignInModal.classList.add('show');
            switchView('home');
            return;
        }

        const checkedAttribute = userPreferences.notifications ? 'checked' : '';
        profileView.innerHTML = `
            <div class="container">
                <div class="profile-card">
                    <div class="profile-header">
                        <img src="${userProfile.picture}" alt="User profile avatar" class="profile-avatar">
                        <h2 class="profile-name">${sanitizeHTML(userProfile.name)}</h2>
                        <p class="profile-email">${sanitizeHTML(userProfile.email)}</p>
                    </div>
                    <div class="profile-form">
                        <div class="form-group">
                            <label for="profile-birthday">Birthday</label>
                            <input type="date" id="profile-birthday" value="${userPreferences.birthday || ''}">
                        </div>
                        <div class="form-group form-group-inline">
                            <label for="notification-toggle">App Notifications</label>
                            <label class="toggle-switch">
                                <input type="checkbox" id="notification-toggle" ${checkedAttribute}>
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>
                    <div class="profile-actions">
                        <button class="btn-save" id="profile-save-btn">Save Changes</button>
                        <button class="btn-sign-out" id="profile-sign-out-btn">Sign Out</button>
                    </div>
                </div>
            </div>`;
    };

    const switchView = (view) => {
        if (currentView !== view) { previousView = currentView; }
        currentView = view;
        window.scrollTo({ top: 0, behavior: 'auto' });
        navLinks.forEach(link => { link.classList.toggle('active', ['home', 'categories', 'popular', 'your-tools', 'your-work', 'profile'].includes(view) && link.dataset.view === view); });
        allPageSections.forEach(section => { section.style.display = section.dataset.viewGroup.includes(view) ? '' : 'none'; });
        if (searchInput.value !== '') { searchInput.value = ''; searchInput.dispatchEvent(new Event('input')); }
        hideTool(false); hideCategoryTools();
        if (view === 'categories' && !categoriesView.innerHTML) renderCategoriesView();
        if (view === 'your-tools') renderYourToolsView();
        if (view === 'your-work') renderYourWorkView();
        if (view === 'profile') renderProfileView(); // New
        if (mainNav.classList.contains('active')) mainNav.classList.remove('active');
    };
    const triggerAlarm = (alarmId) => {
        const alarmData = activeAlarms[alarmId]; if (!alarmData) return;
        if (alarmSound) { alarmSound.play().catch(e => console.error("Error playing sound:", e)); }
        if (Notification.permission === 'granted' && userPreferences.notifications) { new Notification('ToolHub Reminder', { body: `Your reminder for "${alarmData.toolName}" is now!`, icon: 'https://img.icons8.com/plasticine/100/000000/alarm-clock.png' }); }
        if (alarmData.frequency === 'one-time') { alarmData.triggered = true; } else {
            const nextDate = getNextOccurrence(new Date(alarmData.nextOccurrence), alarmData.frequency, alarmData.startTime);
            if (nextDate) { alarmData.nextOccurrence = nextDate.getTime(); const delay = alarmData.nextOccurrence - Date.now(); if (delay > 0) { setTimeout(() => triggerAlarm(alarmId), delay); } } else { alarmData.triggered = true; }
        }
        saveAlarms(); updateYourWorkBadge();
        if (currentView === 'your-tools') renderYourToolsView(); 
        if (currentView === 'your-work') renderYourWorkView();
    };
    const setAlarmWithDate = (toolId, toolName, scheduledDate, frequency) => {
        const scheduledTime = scheduledDate.getTime();
        if (isNaN(scheduledTime) || scheduledTime <= Date.now()) { alert("Invalid date. The date must be in the future."); return; }
        const alarmId = `${toolId}-${scheduledTime}-${Math.random().toString(36).substr(2, 5)}`;
        activeAlarms[alarmId] = { startTime: scheduledTime, nextOccurrence: scheduledTime, toolName, toolId, frequency: frequency || 'one-time', triggered: false };
        saveAlarms(); updateYourWorkBadge();
        setTimeout(() => triggerAlarm(alarmId), scheduledTime - Date.now());
        if (currentView === 'your-tools') renderYourToolsView(); if (currentView === 'your-work') { calendarDisplayDate = new Date(scheduledTime); renderYourWorkView(); }
    };
    const loadAndScheduleAlarms = () => {
        const storedAlarms = JSON.parse(localStorage.getItem('toolHubAlarms')) || {};
        const now = Date.now();
        let alarmsChanged = false;
        Object.entries(storedAlarms).forEach(([alarmId, alarm]) => {
            if (!alarm || typeof alarm.nextOccurrence !== 'number' || !alarm.toolId) { delete storedAlarms[alarmId]; alarmsChanged = true; return; }
            if (alarm.triggered && alarm.frequency === 'one-time') { if (alarm.nextOccurrence < now - (7 * 24 * 60 * 60 * 1000)) { delete storedAlarms[alarmId]; alarmsChanged = true; return; } }
            if (alarm.frequency && alarm.frequency !== 'one-time' && alarm.nextOccurrence < now) {
                let nextDate = new Date(alarm.nextOccurrence);
                while (nextDate.getTime() < now) { const updatedDate = getNextOccurrence(nextDate, alarm.frequency, alarm.startTime); if (!updatedDate) { nextDate = null; break; } nextDate = updatedDate; }
                if (nextDate) { alarm.nextOccurrence = nextDate.getTime(); alarmsChanged = true; }
            }
            const remainingTime = alarm.nextOccurrence - now;
            if (remainingTime > 0 && !(alarm.triggered && alarm.frequency === 'one-time')) { setTimeout(() => triggerAlarm(alarmId), remainingTime); }
        });
        activeAlarms = storedAlarms;
        if (alarmsChanged) { saveAlarms(); }
    };

    const createToolViewerHTML = (toolId, toolName) => {
        const saneToolName = sanitizeHTML(toolName);
        return `<div class="container">
            <div class="sub-view-header">
                <button id="back-to-tools-btn" class="btn-back" aria-label="Go back"><i class="fas fa-arrow-left"></i></button>
                <div class="reminder-controls-desktop">
                     <input type="datetime-local" id="reminderInput">
                     <select id="reminderFrequencyDesktop">
                        <option value="one-time">One time</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                     </select>
                     <button id="setReminderBtn">My Work & Set Reminder</button>
                </div>
                <button class="add-event-mobile-btn" title="Add Event" aria-label="Add event or reminder"><i class="fas fa-calendar-plus"></i></button>
            </div>
            <div class="tool-viewer-content">
                <div id="loader" class="iframe-loader"></div>
                <iframe id="tool-iframe" src="/tools/${toolId}.html" title="${saneToolName}" frameborder="0" style="display:none;" onload="document.getElementById('loader').style.display='none'; this.style.display='block';"></iframe>
            </div>
        </div>`;
    };

    const showTool = (toolId, toolName, saveHistory = true) => {
        document.body.classList.add('tool-view-active'); mainContentWrapper.style.display = 'none'; toolViewerContainer.innerHTML = createToolViewerHTML(toolId, toolName); toolViewerContainer.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (saveHistory) {
            history.pushState({ toolId: toolId }, toolName, `/tool/${toolId}`);
        }
        const reminderInput = document.getElementById('reminderInput'); const setReminderBtn = document.getElementById('setReminderBtn'); const frequencySelect = document.getElementById('reminderFrequencyDesktop'); const addEventMobileBtn = document.querySelector('.add-event-mobile-btn');
        const handleReminderSet = () => {
            if (!reminderInput.value) { if (window.getComputedStyle(setReminderBtn).display !== 'none') { alert('Pick a date & time first'); } return; }
            const when = new Date(reminderInput.value); if (isNaN(when.getTime()) || when <= new Date()) { alert('Choose a future date/time'); reminderInput.value = ''; return; }
            setAlarmWithDate(toolId, toolName, when, frequencySelect.value); alert('Reminder set for ' + when.toLocaleString()); reminderInput.value = '';
        };
        if(setReminderBtn) setReminderBtn.addEventListener('click', handleReminderSet);
        if(addEventMobileBtn) { addEventMobileBtn.addEventListener('click', () => { showDatePickerModal(toolId, toolName); }); }
        if (saveHistory) addRecentTool(toolId);
    };
    const hideTool = (updateHistory = true) => { 
        if (toolViewerContainer.style.display !== 'none') { 
            document.body.classList.remove('tool-view-active'); 
            toolViewerContainer.style.display = 'none'; 
            toolViewerContainer.innerHTML = ''; 
            mainContentWrapper.style.display = 'block'; 
            if (updateHistory) {
                history.pushState({ view: currentView }, '', '/');
            }
        } 
    };
    const showCategoryTools = (categoryName) => { renderCategoryToolsView(categoryName); mainContentWrapper.style.display = 'none'; categoryToolsView.style.display = 'block'; window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const hideCategoryTools = () => { if (categoryToolsView.style.display !== 'none') { categoryToolsView.style.display = 'none'; categoryToolsView.innerHTML = ''; mainContentWrapper.style.display = 'block'; } };
    
    hamburgerMenu.addEventListener('click', () => mainNav.classList.toggle('active'));
    logoLink.addEventListener('click', (e) => { e.preventDefault(); history.pushState({view: 'home'}, '', '/'); switchView('home'); });
    
    const handleDataViewClick = (e) => {
        const link = e.target.closest('a[data-view]');
        if (link && link.id !== 'profile-link') {
            e.preventDefault();
            const view = link.dataset.view;
            const newPath = view === 'home' ? '/' : `/${view}`;
            history.pushState({view: view}, '', newPath);
            switchView(view);
        }
    };
    mainNav.addEventListener('click', handleDataViewClick);
    footerLinks.forEach(link => link.addEventListener('click', handleDataViewClick));

    const showModal = () => signInModal.classList.add('show'); const hideModal = () => signInModal.classList.remove('show');
    modalCloseBtn.addEventListener('click', hideModal); signInModal.addEventListener('click', (e) => { if (e.target === signInModal) hideModal(); });
    
    const guestSignInBtn = signInModal.querySelector('.google-signin-btn');
    if (guestSignInBtn) {
        guestSignInBtn.addEventListener('click', () => {
            signInModal.classList.remove('show');
            profileSignInModal.classList.add('show');
        });
    }

    // Updated: Profile link now navigates to the profile view
    profileLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (userProfile) {
            const view = 'profile';
            const newPath = `/${view}`;
            history.pushState({view: view}, '', newPath);
            switchView(view);
        } else {
            profileSignInModal.classList.add('show');
        }
    });

    profileModalCloseBtn.addEventListener('click', () => profileSignInModal.classList.remove('show'));
    profileSignInModal.addEventListener('click', (e) => {
        if (e.target === profileSignInModal) profileSignInModal.classList.remove('show');
    });
    
    const handleRouteChange = () => {
        const path = window.location.pathname;
        const toolMatch = path.match(/^\/tool\/([a-zA-Z0-9-]+)/);
        if (toolMatch) {
            const toolId = toolMatch[1];
            const tool = toolsData.find(t => t.id === toolId);
            if (tool) {
                showTool(tool.id, tool.Name, false);
            } else {
                history.replaceState({ view: 'home' }, '', '/');
                switchView('home');
            }
        } else {
            hideTool(false);
            const validViews = ['home', 'categories', 'popular', 'your-tools', 'your-work', 'profile']; // Updated
            let view = path.substring(1) || 'home';
            if (!validViews.includes(view)) {
                view = 'home';
                history.replaceState({ view: 'home' }, '', '/');
            }
            switchView(view);
        }
    };

    window.addEventListener('popstate', handleRouteChange);

    window.addEventListener('scroll', () => {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            mainHeader.classList.add('header-hidden');
        } else {
            mainHeader.classList.remove('header-hidden');
        }
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; 
    }, { passive: true });

    const datePickerModal = document.getElementById('datePickerModal'); const datePickerElements = { month: document.getElementById('month-picker'), day: document.getElementById('day-picker'), year: document.getElementById('year-picker'), hour: document.getElementById('hour-picker'), minute: document.getElementById('minute-picker'), ampm: document.getElementById('ampm-picker'), frequency: document.getElementById('reminderFrequencyMobile'), set: document.getElementById('datePickerSet'), cancel: document.getElementById('datePickerCancel'), clear: document.getElementById('datePickerClear'), }; let datePickerScrollTimeout = null;
    const getSelectedItemValue = (wheel) => { const itemHeight = 50; const selected_index = Math.round(wheel.scrollTop / itemHeight); const wheelDiv = wheel.querySelector('.picker-wheel'); if (!wheelDiv || !wheelDiv.children[selected_index]) return null; return wheelDiv.children[selected_index].dataset.value; };
    const populateDays = (year, month) => {
        const previouslySelectedDay = parseInt(getSelectedItemValue(datePickerElements.day), 10) || 1;
        const daysInMonth = new Date(year, month + 1, 0).getDate(); let dayHtml = '<div class="picker-wheel">';
        for (let i = 1; i <= daysInMonth; i++) { dayHtml += `<div class="picker-item" data-value="${i}">${i}</div>`; }
        dayHtml += '</div>'; datePickerElements.day.innerHTML = dayHtml;
        const newSelectedDay = Math.min(previouslySelectedDay, daysInMonth); datePickerElements.day.scrollTop = (newSelectedDay - 1) * 50;
    };
    const showDatePickerModal = (toolId, toolName) => {
        datePickerModal.dataset.toolId = toolId; datePickerModal.dataset.toolName = toolName;
        const now = new Date(); now.setHours(now.getHours() + 1);
        const currentYear = now.getFullYear(); const currentMonth = now.getMonth(); const currentDay = now.getDate(); let currentHour24 = now.getHours(); const currentMinute = Math.ceil(now.getMinutes() / 5) * 5 % 60; const currentAmPm = currentHour24 >= 12 ? 'PM' : 'AM'; let currentHour12 = currentHour24 % 12; if (currentHour12 === 0) currentHour12 = 12;
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; let monthHtml = '<div class="picker-wheel">'; months.forEach((m, i) => monthHtml += `<div class="picker-item" data-value="${i}">${m}</div>`); monthHtml += '</div>'; datePickerElements.month.innerHTML = monthHtml;
        let yearHtml = '<div class="picker-wheel">'; for (let i = currentYear; i < currentYear + 10; i++) { yearHtml += `<div class="picker-item" data-value="${i}">${i}</div>`; } yearHtml += '</div>'; datePickerElements.year.innerHTML = yearHtml;
        populateDays(currentYear, currentMonth);
        let hourHtml = '<div class="picker-wheel">'; for (let i = 1; i <= 12; i++) { hourHtml += `<div class="picker-item" data-value="${i}">${String(i).padStart(2, '0')}</div>`; } hourHtml += '</div>'; datePickerElements.hour.innerHTML = hourHtml;
        let minuteHtml = '<div class="picker-wheel">'; for (let i = 0; i < 60; i += 5) { minuteHtml += `<div class="picker-item" data-value="${i}">${String(i).padStart(2, '0')}</div>`; } minuteHtml += '</div>'; datePickerElements.minute.innerHTML = minuteHtml;
        datePickerElements.ampm.innerHTML = `<div class="picker-wheel"><div class="picker-item" data-value="AM">AM</div><div class="picker-item" data-value="PM">PM</div></div>`;
        datePickerElements.year.scrollTop = 0; datePickerElements.month.scrollTop = currentMonth * 50; datePickerElements.day.scrollTop = (currentDay - 1) * 50; datePickerElements.hour.scrollTop = (currentHour12 - 1) * 50; datePickerElements.minute.scrollTop = (currentMinute / 5) * 50; datePickerElements.ampm.scrollTop = (currentAmPm === 'AM' ? 0 : 1) * 50;
        const handleScroll = () => { clearTimeout(datePickerScrollTimeout); datePickerScrollTimeout = setTimeout(() => { const year = parseInt(getSelectedItemValue(datePickerElements.year), 10); const month = parseInt(getSelectedItemValue(datePickerElements.month), 10); if (!isNaN(year) && !isNaN(month)) { populateDays(year, month); } }, 150); };
        datePickerElements.month.addEventListener('scroll', handleScroll); datePickerElements.year.addEventListener('scroll', handleScroll);
        datePickerModal.classList.add('show');
    };
    const hideDatePickerModal = () => datePickerModal.classList.remove('show');
    datePickerElements.set.addEventListener('click', () => {
        const { toolId, toolName } = datePickerModal.dataset; const year = parseInt(getSelectedItemValue(datePickerElements.year), 10); const month = parseInt(getSelectedItemValue(datePickerElements.month), 10); const day = parseInt(getSelectedItemValue(datePickerElements.day), 10); let hour = parseInt(getSelectedItemValue(datePickerElements.hour), 10); const minute = parseInt(getSelectedItemValue(datePickerElements.minute), 10); const ampm = getSelectedItemValue(datePickerElements.ampm); const frequency = datePickerElements.frequency.value;
        if (![year, month, day, hour, minute].some(isNaN) && ampm) {
            if (ampm === 'PM' && hour < 12) hour += 12; if (ampm === 'AM' && hour === 12) hour = 0;
            const selectedDate = new Date(year, month, day, hour, minute); setAlarmWithDate(toolId, toolName, selectedDate, frequency); alert('Reminder set for ' + selectedDate.toLocaleString()); hideDatePickerModal();
        } else { alert('An error occurred. Please try again.'); }
    });
    datePickerElements.cancel.addEventListener('click', hideDatePickerModal); datePickerModal.addEventListener('click', (e) => { if(e.target === datePickerModal) hideDatePickerModal(); });
    datePickerElements.clear.addEventListener('click', () => { if(datePickerModal.dataset.toolId && datePickerModal.dataset.toolName) { showDatePickerModal(datePickerModal.dataset.toolId, datePickerModal.dataset.toolName); } });
    
    const debounce = (func, delay) => { let timeoutId; return (...args) => { clearTimeout(timeoutId); timeoutId = setTimeout(() => { func.apply(this, args); }, delay); }; };
    const handleSearch = () => {
        const query = searchInput.value.toLowerCase().trim(); const safeQuery = sanitizeHTML(query);
        if (query.length === 0) {
            searchResultsView.style.display = 'none';
            if (currentView === 'home' || currentView === 'popular') {
                popularToolsSection.style.display = '';
            }
            if (currentView === 'home') {
                newToolsSection.style.display = '';
            }
            return;
        }
        popularToolsSection.style.display = 'none';
        newToolsSection.style.display = 'none';
        searchResultsView.style.display = '';
        
        if (query.length < 2) {
            searchResultsHeading.textContent = `Please type at least 2 characters...`;
            searchResultsGrid.innerHTML = '';
            return;
        }
        const filteredTools = toolsData.filter(tool => tool.Name.toLowerCase().includes(query));
        searchResultsHeading.innerHTML = `Found ${filteredTools.length} tools for "<strong>${safeQuery}</strong>"`;
        const emptyMessage = `Found 0 tools for "<strong>${safeQuery}</strong>". Please email the tool name to <a href="mailto:support@toolshub365.com">Support_Team</a>. Your requested tool will be added shortly with Name.Day to day update <a href="https://whatsapp.com/channel/0029VbBM5GhDuMRZKFJO6x14">Whatsapp_Channel</a>.<div class="idea-credit"><i class="fas fa-lightbulb"></i> Idea Share: Ayra, New York, USA</div>`;
        renderTools(searchResultsGrid, filteredTools, false, emptyMessage);
    };
    searchInput.addEventListener('input', debounce(handleSearch, 300));

    const handleBookmarkClick = (button) => {
        const toolId = button.dataset.toolId; if (!toolId) return;
        if (isBookmarked(toolId)) { bookmarks = bookmarks.filter(id => id !== toolId); button.classList.remove('bookmarked'); } else { if (bookmarks.length >= GUEST_BOOKMARK_LIMIT && !userProfile) { showModal(); return; } bookmarks.push(toolId); button.classList.add('bookmarked'); }
        saveBookmarks(); if (currentView === 'your-tools') renderYourToolsView();
    };
    const handleShareClick = async (button) => {
        const { toolId, toolTitle } = button.dataset; const url = `${window.location.origin}/tool/${toolId}`; const shareData = { title: `Check out: ${toolTitle}`, text: `I found a great free tool on ToolHub: ${toolTitle}`, url };
        try { await navigator.share(shareData); } catch (err) { try { await navigator.clipboard.writeText(url); const originalIcon = button.innerHTML; button.innerHTML = '<i class="fas fa-check"></i>'; setTimeout(() => { button.innerHTML = originalIcon; }, 2000); } catch (err) { alert('Could not copy URL. Please copy it manually: ' + url); } }
    };
    document.body.addEventListener('click', (e) => {
        const openBtn = e.target.closest('.btn-open'); const bookmarkBtn = e.target.closest('.btn-bookmark'); const shareBtn = e.target.closest('.btn-share'); const backBtn = e.target.closest('#back-to-tools-btn'); const categoryCard = e.target.closest('.category-card'); const backToCategoriesBtn = e.target.closest('#back-to-categories-btn');
        if (openBtn) { 
            e.preventDefault();
            const { toolId, toolName } = openBtn.dataset; 
            if (toolId && toolName) showTool(toolId, toolName, true);
        }
        if (bookmarkBtn) handleBookmarkClick(bookmarkBtn); 
        if (shareBtn) handleShareClick(shareBtn);
        if (backBtn) { 
            history.back();
        }
        if (categoryCard) showCategoryTools(categoryCard.dataset.categoryName); 
        if (backToCategoriesBtn) hideCategoryTools();

        // New: Profile Page event handlers
        if (e.target.id === 'profile-save-btn') {
            const birthdayInput = document.getElementById('profile-birthday');
            const notificationsInput = document.getElementById('notification-toggle');
            userPreferences.birthday = birthdayInput.value;
            userPreferences.notifications = notificationsInput.checked;
            saveUserPreferences();
            alert('Preferences saved!');
        }
        if (e.target.id === 'profile-sign-out-btn') {
            signOut();
        }

        if (currentView === 'your-work') {
            const deleteEventBtn = e.target.closest('.delete-event-btn'); 
            const calendarEvent = e.target.closest('.calendar-event');
            if (e.target.closest('#calendar-today-btn')) { calendarDisplayDate = new Date(); renderYourWorkView(); }
            if (e.target.closest('#calendar-prev-btn')) { calendarDisplayDate.setDate(calendarDisplayDate.getDate() - 1); renderYourWorkView(); }
            if (e.target.closest('#calendar-next-btn')) { calendarDisplayDate.setDate(calendarDisplayDate.getDate() + 1); renderYourWorkView(); }
            if (deleteEventBtn) {
                e.stopPropagation(); 
                const alarmId = deleteEventBtn.dataset.alarmId; 
                const alarm = activeAlarms[alarmId]; 
                const message = (alarm && alarm.frequency !== 'one-time') ? 'Are you sure you want to delete this recurring reminder and all its future occurrences?' : 'Are you sure you want to delete this reminder?';
                if (alarmId && confirm(message)) { delete activeAlarms[alarmId]; saveAlarms(); updateYourWorkBadge(); renderYourWorkView(); }
            } else if (calendarEvent && !calendarEvent.classList.contains('is-completed')) { 
                const { toolId, toolName } = calendarEvent.dataset; 
                if (toolId && toolName) showTool(toolId, toolName, true); 
            }
        }
    });

    function initializeApp(data) {
        toolsData = data;
        
        const storedProfile = localStorage.getItem('toolHubUserProfile');
        if (storedProfile) {
            userProfile = JSON.parse(storedProfile);
            loadUserPreferences(); // New
            updateUIForLogin();
        }

        loadAndScheduleAlarms();
        updateYourWorkBadge();
        const shuffledTools = [...data].sort(() => 0.5 - Math.random());
        const numPopular = 18;
        const numNew = 18;
        const popularTools = shuffledTools.slice(0, numPopular);
        const newTools = shuffledTools.slice(-numNew);
        renderTools(popularGrid, popularTools);
        renderTools(newGrid, newTools.reverse());
        document.getElementById('copyright-year').textContent = new Date().getFullYear();
        const mobileBanner = document.getElementById('mobile-top-banner-ad-rotator');
        if (mobileBanner && mainHeader && window.getComputedStyle(mobileBanner).display !== 'none') {
            mainHeader.style.top = '0px';
        }
        
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            popularTools.slice(0, 10).forEach(tool => {
              const link = document.createElement('link');
              link.rel = 'prefetch';
              link.href = `/tools/${tool.id}.html`;
              document.head.appendChild(link);
            });
          });
        }
        handleRouteChange();
    }
    
    const bannerRotator = document.getElementById('mobile-top-banner-ad-rotator');
    if (bannerRotator) {
        const banners = bannerRotator.querySelectorAll('.banner-link-wrapper');
        if (banners.length > 1) {
            let currentIndex = 0;
            const rotateBanners = () => { 
                banners[currentIndex].classList.remove('active'); 
                currentIndex = (currentIndex + 1) % banners.length; 
                banners[currentIndex].classList.add('active'); 
            };
            setInterval(rotateBanners, 4000);
        }
    }
    
    async function loadData() { 
        try { 
            const response = await fetch(`/tools.json`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); 
            initializeApp(await response.json()); 
        } catch (error) { 
            console.error("Failed to load tools data:", error);
            if(popularGrid) popularGrid.innerHTML = `<p style="text-align: center; padding: 2rem;">Could not load tools. Please try again later.</p>`;
            if(newGrid) newGrid.innerHTML = '';
        } 
    }
    loadData();
});
