// FIXED: This module no longer needs to import DOMPurify.
// It will correctly access the global version loaded by index.html.

export function renderYourWorkView(yourWorkView, activeAlarms, calendarDisplayDate) {
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
    
    const sanitizeHTML = (str) => {
        if (typeof DOMPurify === 'undefined') {
            const temp = document.createElement('div');
            temp.textContent = str;
            return temp.innerHTML;
        }
        return DOMPurify.sanitize(str);
    };

    const formatRange = (start, end) => { const options = { month: 'short', day: 'numeric' }; return `${start.toLocaleDateString(undefined, options)} - ${end.toLocaleDateString(undefined, {...options, year: 'numeric'})}`; }
    const allEvents = [];
    Object.entries(activeAlarms).forEach(([alarmId, alarm]) => {
        if (alarm.triggered && alarm.frequency === 'one-time') return;
        let occurrence = new Date(alarm.startTime);
        const searchStart = new Date(startOfView.getTime() - 31 * 24 * 60 * 60 * 1000);
        if (occurrence > endOfView) return;
        if (occurrence < searchStart && alarm.frequency !== 'one-time') {
            while (occurrence < searchStart) {
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
        const eventsForDay = allEvents.filter(event => event.date.getFullYear() === day.getFullYear() && event.date.getMonth() === day.getMonth() && event.date.getDate() === day.getDate()).sort((a, b) => a.date - b.date);
        const isEmptyClass = eventsForDay.length === 0 ? 'is-empty' : '';
        let eventsHtml = eventsForDay.map(event => `<div class="calendar-event ${event.isCompleted ? 'is-completed' : ''}" data-tool-id="${event.toolId}" data-tool-name="${sanitizeHTML(event.name)}" title="${sanitizeHTML(event.name)}"><span class="event-text-wrapper">${sanitizeHTML(event.name)}</span><button class="delete-event-btn" data-alarm-id="${event.alarmId}">&times;</button></div>`).join('');
        calendarHtml += `<div class="calendar-day ${isTodayClass} ${isActiveDateClass} ${isEmptyClass}"><div class="mobile-event-sidebar"><span>My Work (task)</span></div><div class="mobile-event-main-content"><div class="calendar-day-full-date">${fullDateStr}</div><div class="calendar-day-header"><span class="day-name">${dayName}</span><span class="day-number">${dayDate}</span></div><div class="calendar-events-container">${eventsHtml}</div></div></div>`;
    }
    yourWorkView.innerHTML = `<div class="container"><h2><i class="fas fa-briefcase" style="color:#7c3aed;"></i> My Work</h2><div class="your-work-controls"><button id="calendar-today-btn">Today</button><button id="calendar-prev-btn"><i class="fas fa-chevron-left"></i></button><button id="calendar-next-btn"><i class="fas fa-chevron-right"></i></button><span class="your-work-date-range">${formatRange(startOfView, endRangeDate)}</span></div><div class="calendar-container"><div class="calendar-grid">${calendarHtml}</div></div></div>`;
};
