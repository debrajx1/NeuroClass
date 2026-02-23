// List of predefined holidays (YYYY-MM-DD format)
// In a full production app, this would be fetched from a database or an external Calendar API
const HOLIDAYS_2026 = [
    '2026-01-26', // Republic Day
    '2026-03-03', // Maha Shivaratri
    '2026-03-22', // Holi
    '2026-04-10', // Good Friday
    '2026-08-15', // Independence Day
    '2026-10-02', // Gandhi Jayanti
    '2026-10-18', // Dussehra
    '2026-11-08', // Diwali
    '2026-12-25', // Christmas

    // College specific examples (Can be managed via DB later)
    '2026-02-26', // TechFest / Presentation Day (Added for demonstration)
];

const isHoliday = (date) => {
    // Get local date parts to avoid UTC timezone offset issues at night
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const localDateStr = `${year}-${month}-${day}`;

    return HOLIDAYS_2026.includes(localDateStr);
};

module.exports = {
    HOLIDAYS_2026,
    isHoliday
};
