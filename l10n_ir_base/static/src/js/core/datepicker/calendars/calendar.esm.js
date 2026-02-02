/** @odoo-module **/
export class Calendar {
    constructor() {
        this.data = {
            year: 0,
            month: 0,
            day: 0,
            hour: 0,
            minute: 0,
            second: 0,
            millisecond: 0,
        };

        // If (new.target === Abstract) {
        //   throw new TypeError("Cannot construct Abstract instances directly");
        // }
    }

    /**
     * Returns the name of the calender
     * @example Calendar.local(2016).name //=> 'iso8601'
     * @type {String}
     */
    get name() {
        throw new TypeError("Must override method");
    }
}
