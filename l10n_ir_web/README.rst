Description
===========

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


Usecase
=======




Installation
============




Configuration
=============




Usage
=====

1.  **Installation:** Install the module to enable Jalali support
    system-wide.
2.  **Language Settings:** Ensure your user profile language is set to
    **Persian (fa_IR)**.
3.  **Date Fields:**
    - Navigate to any form with a date or datetime field.
    - Click on the date picker icon. The calendar will now display days
      in Persian.
    - Select a date. The input field will show the date in Persian
      format (e.g., ۱۴۰۴/۱۱/۰۳).
4.  **List Views:** Dates in list and kanban views will automatically
    display in the Jalali format.


Contributer
===========

- MoonSun PTY LTD


Credits
=======

- MoonSun PTY LTD


History
=======




Development
===========



