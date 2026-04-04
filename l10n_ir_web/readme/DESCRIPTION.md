This module overrides the standard Odoo date and datetime pickers to
support the Jalali calendar. It provides a seamless experience for
Persian users by:

- **Input Conversion:** Automatically converting Gregorian dates to
  Jalali in input fields when the locale is set to Persian (fa_IR).
- **Display Formatting:** Formatting dates in List, Kanban, and Form
  views using the Persian calendar and numerals.
- **Data Integrity:** Ensures that all dates are stored in the database
  in standard Gregorian format (ISO 8601), preventing data corruption.
- **Bidirectional Support:** Correctly handles switching between Persian
  and English locales without breaking the UI.
