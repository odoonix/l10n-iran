/** @odoo-module **/

import {Algorithms} from "./algorithms.esm";
import {Duration} from "./duration.esm";
import {Helpers} from "./helpers.esm";
import {TypeChecking} from "./type-checking.esm";
import {Validator} from "./validator.esm";

import {EN as en} from "./en.esm";
import {FA as fa} from "./fa.esm";

const {DateTime} = luxon;

export function toCalendartype(type) {
    switch (type) {
        case "persian":
            return "persian";
        case "gregorian":
        case "iso8601":
            return "gregorian";
    }
}

export function fromCalendartype(type) {
    switch (type) {
        case "persian":
            return "persian";
        case "gregorian":
        case "iso8601":
            return "iso8601";
    }
}

// Let toPersianDigit = new Helpers().toPersianDigit;
// let leftZeroFill = new Helpers().leftZeroFill;
const normalizeDuration = new Helpers().normalizeDuration;

export class PersianDate {
    //     Ts = 0;            // unix timestamp
    //     z = undefined;     // Zone
    //     c = undefined;     // Calendar
    //     // o: inst.o,      // ??
    //     // loc: inst.loc,  // local
    //     invalid = true;    // state

    //   /**
    //    * @access private
    //    */
    //   constructor(config) {
    //     const z = config.zone || Settings.defaultZone;

    //     let invalid =
    //       config.invalid ||
    //       (Number.isNaN(config.ts) ? new Invalid("invalid input") : null) ||
    //       (!zone.isValid ? unsupportedZone(zone) : null);
    //     /**
    //      * @access private
    //      */
    //     this.ts = isUndefined(config.ts) ? Settings.now() : config.ts;

    //     let c = null,
    //       o = null;
    //     if (!invalid) {
    //       const unchanged = config.old && config.old.ts === this.ts && config.old.zone.equals(zone);

    //       if (unchanged) {
    //         [c, o] = [config.old.c, config.old.o];
    //       } else {
    //         const ot = zone.offset(this.ts);
    //         c = tsToObj(this.ts, ot);
    //         invalid = Number.isNaN(c.year) ? new Invalid("invalid input") : null;
    //         c = invalid ? null : c;
    //         o = invalid ? null : ot;
    //       }
    //     }

    //     /**
    //      * @access private
    //      */
    //     this._zone = zone;
    //     /**
    //      * @access private
    //      */
    //     this.loc = config.loc || Locale.create();
    //     /**
    //      * @access private
    //      */
    //     this.invalid = invalid;
    //     /**
    //      * @access private
    //      */
    //     this.weekData = null;
    //     /**
    //      * @access private
    //      */
    //     this.c = c;
    //     /**
    //      * @access private
    //      */
    //     this.o = o;
    //     /**
    //      * @access private
    //      */
    //     this.isLuxonDateTime = true;
    //   }

    // /////////////////////////////////////////////////////////////////////////////////////
    // ////////////////////////////// Old Version of////////////////////////////////////////
    // /////////////////////////////////////////////////////////////////////////////////////

    /**
     * @param {*} input
     * @returns {PersianDate}
     */
    constructor(input) {
        this.calendarType = PersianDate.calendarType;
        this.localType = PersianDate.localType;
        this.leapYearMode = PersianDate.leapYearMode;

        this.algorithms = new Algorithms(this);
        this.version = 12;
        this._utcMode = false;
        // If (this.localType !== "fa") {
        //   this.formatPersian = false;
        // } else {
        this.formatPersian = "_default";
        // }
        this.State = this.algorithms.State;
        this.setup(input);
        if (this.State.isInvalidDate) {
            // Return Date like message
            return new Date([-1, -1]);
        }
        return this;
    }

    /**
     * @param {*} input
     * @returns {*}
     */
    setup(input) {
        // Convert Any thing to Gregorian Date
        if (TypeChecking.isDate(input)) {
            this._gDateToCalculators(input);
        } else if (TypeChecking.isArray(input)) {
            if (!Validator.validateInputArray(input)) {
                this.State.isInvalidDate = true;
                return false;
            }
            this.algorithmsCalc([
                input[0],
                input[1] ? input[1] : 1,
                input[2] ? input[2] : 1,
                input[3] ? input[3] : 0,
                input[4] ? input[4] : 0,
                input[5] ? input[5] : 0,
                input[6] ? input[6] : 0,
            ]);
        } else if (TypeChecking.isNumber(input)) {
            const fromUnix = new Date(input);
            this._gDateToCalculators(fromUnix);
        }
        // Instance of pDate
        else if (input instanceof PersianDate) {
            this.algorithmsCalc([
                input.year(),
                input.month(),
                input.date(),
                input.hour(),
                input.minute(),
                input.second(),
                input.millisecond(),
            ]);
        }
        // ASP.NET JSON Date
        else if (input && input.substring(0, 6) === "/Date(") {
            this._gDateToCalculators(new Date(parseInt(input.substr(6), 10)));
        } else {
            const now = new Date();
            this._gDateToCalculators(now);
        }
    }

    /**
     * @param {*} input
     * @returns {*}
     * @private
     */
    _getSyncedClass(input) {
        const syncedCelander = PersianDate.toCalendar(this.calendarType)
            .toLocale(this.localType)
            .toLeapYearMode(this.leapYearMode);
        return new syncedCelander(input);
    }

    /**
     * @param {*} inputgDate
     * @private
     */
    _gDateToCalculators(inputgDate) {
        this.algorithms.calcGregorian([
            inputgDate.getFullYear(),
            inputgDate.getMonth(),
            inputgDate.getDate(),
            inputgDate.getHours(),
            inputgDate.getMinutes(),
            inputgDate.getSeconds(),
            inputgDate.getMilliseconds(),
        ]);
    }

    /**
     * @since 1.0.0
     * @description Helper method that return date range name like week days name, month names, month days names (specially in persian calendar).
     * @static
     * @returns {*}
     */
    static rangeName() {
        const p = PersianDate,
            t = p.calendarType;
        if (p.localType === "fa") {
            if (t === "persian") {
                return fa.persian;
            }
            return fa.gregorian;
        }
        if (t === "persian") {
            return en.persian;
        }
        return en.gregorian;
    }

    /**
     * @since 1.0.0
     * @description Helper method that return date range name like week days name, month names, month days names (specially in persian calendar).
     * @returns {*}
     */
    rangeName() {
        const t = this.calendarType;
        if (this.localType === "fa") {
            if (t === "persian") {
                return fa.persian;
            }
            return fa.gregorian;
        }
        if (t === "persian") {
            return en.persian;
        }
        return en.gregorian;
    }

    /**
     * @since 1.0.0
     * @param {*} input
     * @returns {PersianDate}
     */
    toLeapYearMode(input) {
        this.leapYearMode = input;
        if (input === "astronomical" && this.calendarType === "persian") {
            this.leapYearMode = "astronomical";
        } else if (input === "algorithmic" && this.calendarType === "persian") {
            this.leapYearMode = "algorithmic";
        }
        this.algorithms.updateFromGregorian();
        return this;
    }

    /**
     * @since 1.0.0
     * @static
     * @param {*} input
     * @returns {PersianDate}
     */
    static toLeapYearMode(input) {
        const d = PersianDate;
        d.leapYearMode = input;
        return d;
    }

    /**
     * @since 1.0.0
     * @param {*} input
     * @returns {PersianDate}
     */
    toCalendar(input) {
        this.calendarType = input;
        this.algorithms.updateFromGregorian();
        return this;
    }

    /**
     * @since 1.0.0
     * @static
     * @param {*} input
     * @returns {PersianDate}
     */
    static toCalendar(input) {
        const d = PersianDate;
        d.calendarType = input;
        return d;
    }

    /**
     * @since 1.0.0
     * @static
     * @param {*} input
     * @returns {PersianDate}
     */
    static toLocale(input) {
        const d = PersianDate;
        d.localType = input;
        if (d.localType === "fa") {
            d.formatPersian = "_default";
        } else {
            d.formatPersian = false;
        }
        return d;
    }

    /**
     * @since 1.0.0
     * @param {*} input
     * @returns {PersianDate}
     */
    toLocale(input) {
        this.localType = input;
        if (this.localType === "fa") {
            this.formatPersian = "_default";
        } else {
            this.formatPersian = false;
        }
        return this;
    }

    /**
     * @returns {*}
     * @private
     */
    _locale() {
        const t = this.calendarType;
        if (this.localType === "fa") {
            if (t === "persian") {
                return fa.persian;
            }
            return fa.gregorian;
        }
        if (t === "persian") {
            return en.persian;
        }
        return en.gregorian;
    }

    /**
     * @param {*} input
     * @private
     * @returns Name of the week
     */
    _weekName(input) {
        return this._locale().weekdays[input - 1];
    }

    /**
     * @param {*} input
     * @private
     * @returns name of the week
     */
    _weekNameShort(input) {
        return this._locale().weekdaysShort[input - 1];
    }

    /**
     * @param {*} input
     * @private
     * @returns name of the week input in minimal format
     */
    _weekNameMin(input) {
        return this._locale().weekdaysMin[input - 1];
    }

    /**
     * @param {*} input
     * @returns {*}
     * @private
     */
    _dayName(input) {
        return this._locale().persianDaysName[input - 1];
    }

    /**
     * @param {*} input
     * @private
     * @returns name of the input month
     */
    _monthName(input) {
        return this._locale().months[input - 1];
    }

    /**
     * @param {*} input
     * @private
     * @returns name of the input month
     */
    _monthNameShort(input) {
        return this._locale().monthsShort[input - 1];
    }

    /**
     * @param {*} obj
     * @returns {Boolean}
     * @returns treu of the obj is persian date
     */
    static isPersianDate(obj) {
        return obj instanceof PersianDate;
    }

    /**
     * @param {*} obj
     * @returns {Boolean}
     * @returns treu of the obj is persian date
     */
    isPersianDate(obj) {
        return obj instanceof PersianDate;
    }

    /**
     * @returns {PersianDate}
     */
    clone() {
        return this._getSyncedClass(this.State.gDate);
    }

    /**
     * @since 1.0.0
     * @param {*} dateArrayValue
     * @returns {*}
     */
    algorithmsCalc(dateArrayValue) {
        let dateArray = dateArrayValue;
        if (this.isPersianDate(dateArray)) {
            dateArray = [
                dateArray.year(),
                dateArray.month(),
                dateArray.date(),
                dateArray.hour(),
                dateArray.minute(),
                dateArray.second(),
                dateArray.millisecond(),
            ];
        }
        if (this.calendarType === "persian" && this.leapYearMode === "algorithmic") {
            return this.algorithms.calcPersian(dateArray);
        } else if (this.calendarType === "persian" && this.leapYearMode === "astronomical") {
            return this.algorithms.calcPersiana(dateArray);
        } else if (this.calendarType === "gregorian") {
            dateArray[1] -= 1;
            return this.algorithms.calcGregorian(dateArray);
        }
    }

    /**
     * @since 1.0.0
     * @returns {*}
     */
    calendar() {
        let key = null;
        if (this.calendarType === "persian") {
            if (this.leapYearMode === "astronomical") {
                key = "persianAstro";
            } else if (this.leapYearMode === "algorithmic") {
                key = "persianAlgo";
            }
        } else {
            key = "gregorian";
        }
        return this.State[key];
    }

    /**
     * @description return Duration object
     * @param {*} input
     * @param {*} key
     * @returns {Duration}
     */
    static duration(input, key) {
        return new Duration(input, key);
    }

    /**
     * @description return Duration object
     * @param {*} input
     * @param {*} key
     * @returns {Duration}
     */
    duration(input, key) {
        return new Duration(input, key);
    }

    /**
     * @description check if passed object is duration
     * @param {*} obj
     * @returns {Boolean}
     */
    static isDuration(obj) {
        return obj instanceof Duration;
    }

    /**
     * @description check if passed object is duration
     * @param {*} obj
     * @returns {Boolean}
     */
    isDuration(obj) {
        return obj instanceof Duration;
    }

    /**
     * @param {*} input
     * @returns {*}
     */
    years(input) {
        return this.year(input);
    }

    /**
     * @param {*} input
     * @returns {*}
     */
    year(input) {
        if (input || input === 0) {
            this.algorithmsCalc([
                input,
                this.month(),
                this.date(),
                this.hour(),
                this.minute(),
                this.second(),
                this.millisecond(),
            ]);
            return this;
        }
        return this.calendar().year;
    }

    /**
     * @param {*} input
     * @returns {*}
     */
    month(input) {
        if (input || input === 0) {
            this.algorithmsCalc([this.year(), input, this.date()]);
            return this;
        }
        return this.calendar().month + 1;
    }

    /**
     * Day of week
     * @returns {Function|Date.toJSON.day|date_json.day|PersianDate.day|day|output.day|*}
     */
    days() {
        return this.day();
    }

    /**
     * @returns {Function|Date.toJSON.day|date_json.day|PersianDate.day|day|output.day|*}
     */
    day() {
        return this.calendar().weekday;
    }

    /**
     * Day of Months
     * @param {*} input
     * @returns {*}
     */
    dates(input) {
        return this.date(input);
    }

    /**
     * @param {*} input
     * @returns {*}
     */
    date(input) {
        if (input || input === 0) {
            this.algorithmsCalc([this.year(), this.month(), input]);
            return this;
        }
        return this.calendar().day;
    }

    /**
     * @param {*} input
     * @returns {*}
     */
    hour(input) {
        return this.hours(input);
    }

    /**
     * @param {*} input
     * @returns {*}
     */
    hours(input) {
        if (input || input === 0) {
            const val = input === 0 ? 24 : input;
            this.algorithmsCalc([this.year(), this.month(), this.date(), val]);
            return this;
        }
        return this.State.gDate.getHours();
    }

    /**
     * @param {*} input
     * @returns {*}
     */
    minute(input) {
        return this.minutes(input);
    }

    /**
     * @param {*} input
     * @returns {*}
     */
    minutes(input) {
        if (input || input === 0) {
            this.algorithmsCalc([this.year(), this.month(), this.date(), this.hour(), input]);
            return this;
        }
        return this.State.gDate.getMinutes();
    }

    /**
     * @param {*} input
     * @returns {*}
     */
    second(input) {
        return this.seconds(input);
    }

    /**
     * @param {*} input
     * @returns {*}
     */
    seconds(input) {
        if (input || input === 0) {
            this.algorithmsCalc([this.year(), this.month(), this.date(), this.hour(), this.minute(), input]);
            return this;
        }
        return this.State.gDate.getSeconds();
    }

    /**
     * @param {*} input
     * @returns {*}
     * Getter Setter
     */
    millisecond(input) {
        return this.milliseconds(input);
    }

    /**
     * @param {*} input
     * @returns {*}
     */
    milliseconds(input) {
        if (input || input === 0) {
            this.algorithmsCalc([
                this.year(),
                this.month(),
                this.date(),
                this.hour(),
                this.minute(),
                this.second(),
                input,
            ]);
            return this;
        }
        return this.State.gregorian.millisecond;
    }

    static unix(timestamp) {
        if (timestamp) {
            return new PersianDate(timestamp * 1000);
        }
        return new PersianDate().unix();
    }

    /**
     * Return Unix Timestamp (1318874398)
     * @param {*} timestamp
     * @returns {*}
     */
    unix(timestamp) {
        if (timestamp) {
            return this._getSyncedClass(timestamp * 1000);
        }
        const str = this.State.gDate.valueOf().toString();
        return parseInt(str.substring(0, str.length - 3), 10);
    }

    /**
     * @returns {*}
     */
    valueOf() {
        return this.State.gDate.valueOf();
    }

    /**
     * @param {*} year
     * @param {*} month
     * @returns {*}
     * @since 1.0.0
     */
    static getFirstWeekDayOfMonth(year, month) {
        return new PersianDate([year, month, 1]).day();
    }

    /**
     * @param {*} year
     * @param {*} month
     * @returns {*}
     * @since 1.0.0
     */
    getFirstWeekDayOfMonth(year, month) {
        return this._getSyncedClass([year, month, 1]).day();
    }

    /**
     * @param {*} input
     * @param {*} val
     * @param {*} asFloat
     * @returns {*}
     */
    diff(input, val, asFloat) {
        const self = this;
        const inputMoment = input;
        const zoneDiff = 0;
        const diff = self.State.gDate - inputMoment.toDate() - zoneDiff;
        const year = self.year() - inputMoment.year();
        const month = self.month() - inputMoment.month();
        const date = (self.date() - inputMoment.date()) * -1;
        let output = null;

        if (val === "months" || val === "month") {
            output = year * 12 + month + date / 30;
        } else if (val === "years" || val === "year") {
            output = year + (month + date / 30) / 12;
        } else {
            output =
                val === "seconds" || val === "second"
                    ? diff / 1e3
                    : val === "minutes" || val === "minute"
                    ? diff / 6e4
                    : val === "hours" || val === "hour"
                    ? diff / 36e5
                    : val === "days" || val === "day"
                    ? diff / 864e5
                    : val === "weeks" || val === "week"
                    ? diff / 6048e5
                    : diff;
        }
        return asFloat ? output : Math.round(output);
    }

    /**
     * @param {*} key
     * @returns {*}
     */
    startOf(key) {
        const syncedCelander = PersianDate.toCalendar(this.calendarType).toLocale(this.localType);
        const newArray = new PersianDate(this.valueOf() - (this.calendar().weekday - 1) * 86400000).toArray();
        // Simplify this\
        /* jshint ignore:start */
        switch (key) {
            case "years":
            case "year":
                return new syncedCelander([this.year(), 1, 1]);
            case "months":
            case "month":
                return new syncedCelander([this.year(), this.month(), 1]);
            case "days":
            case "day":
                return new syncedCelander([this.year(), this.month(), this.date(), 0, 0, 0]);
            case "hours":
            case "hour":
                return new syncedCelander([this.year(), this.month(), this.date(), this.hours(), 0, 0]);
            case "minutes":
            case "minute":
                return new syncedCelander([this.year(), this.month(), this.date(), this.hours(), this.minutes(), 0]);
            case "seconds":
            case "second":
                return new syncedCelander([
                    this.year(),
                    this.month(),
                    this.date(),
                    this.hours(),
                    this.minutes(),
                    this.seconds(),
                ]);
            case "weeks":
            case "week":
                return new syncedCelander(newArray);
            default:
                return this.clone();
        }
        /* jshint ignore:end */
    }

    /**
     * @param {*} key
     * @returns {*}
     */
    /* eslint-disable no-case-declarations */
    endOf(key) {
        const syncedCelander = PersianDate.toCalendar(this.calendarType).toLocale(this.localType);
        // Simplify this
        switch (key) {
            case "years":
            case "year":
                const days = this.isLeapYear() ? 30 : 29;
                return new syncedCelander([this.year(), 12, days, 23, 59, 59]);
            case "months":
            case "month":
                const monthDays = this.daysInMonth(this.year(), this.month());
                return new syncedCelander([this.year(), this.month(), monthDays, 23, 59, 59]);
            case "days":
            case "day":
                return new syncedCelander([this.year(), this.month(), this.date(), 23, 59, 59]);
            case "hours":
            case "hour":
                return new syncedCelander([this.year(), this.month(), this.date(), this.hours(), 59, 59]);
            case "minutes":
            case "minute":
                return new syncedCelander([this.year(), this.month(), this.date(), this.hours(), this.minutes(), 59]);
            case "seconds":
            case "second":
                return new syncedCelander([
                    this.year(),
                    this.month(),
                    this.date(),
                    this.hours(),
                    this.minutes(),
                    this.seconds(),
                ]);
            case "weeks":
            case "week":
                const weekDayNumber = this.calendar().weekday;
                return new syncedCelander([this.year(), this.month(), this.date() + (7 - weekDayNumber)]);
            default:
                return this.clone();
        }
        /* eslint-enable no-case-declarations */
    }

    /**
     * @returns {*}
     */
    sod() {
        return this.startOf("day");
    }

    /**
     * @returns {*}
     */
    eod() {
        return this.endOf("day");
    }

    /**
     * Get the timezone offset in minutes.
     * @param {*} input
     * @returns {*}
     */
    zone(input) {
        if (input || input === 0) {
            this.State.zone = input;
            return this;
        }
        return this.State.zone;
    }

    /**
     * @returns {PersianDate}
     */
    local() {
        let utcStamp = null;
        if (this._utcMode) {
            const ThatDayOffset = new Date(this.toDate()).getTimezoneOffset();
            const offsetMils = ThatDayOffset * 60 * 1000;
            if (ThatDayOffset < 0) {
                utcStamp = this.valueOf() - offsetMils;
            } else {
                /* istanbul ignore next */
                utcStamp = this.valueOf() + offsetMils;
            }
            this.toCalendar(PersianDate.calendarType);
            const utcDate = new Date(utcStamp);
            this._gDateToCalculators(utcDate);
            this._utcMode = false;
            this.zone(ThatDayOffset);
            return this;
        }
        return this;
    }

    /**
     * @param {*} input
     * @returns {*}
     */
    static utc(input) {
        if (input) {
            return new PersianDate(input).utc();
        }
        return new PersianDate().utc();
    }

    /**
     * @description Current date/time in UTC mode
     * @param {*} input
     * @returns {*}
     */
    utc(input) {
        let utcStamp = null;
        if (input) {
            return this._getSyncedClass(input).utc();
        }
        if (this._utcMode) {
            return this;
        }
        const offsetMils = this.zone() * 60 * 1000;
        if (this.zone() < 0) {
            utcStamp = this.valueOf() + offsetMils;
        } else {
            /* istanbul ignore next */
            utcStamp = this.valueOf() - offsetMils;
        }
        const utcDate = new Date(utcStamp),
            d = this._getSyncedClass(utcDate);
        this.algorithmsCalc(d);
        this._utcMode = true;
        this.zone(0);
        return this;
    }

    /**
     * @returns {Boolean}
     */
    isUtc() {
        return this._utcMode;
    }

    /**
     * @returns {Boolean}
     * @link https://fa.wikipedia.org/wiki/%D8%B3%D8%A7%D8%B9%D8%AA_%D8%AA%D8%A7%D8%A8%D8%B3%D8%AA%D8%A7%D9%86%DB%8C
     */
    isDST() {
        const month = this.month(),
            day = this.date();
        if ((month === 1 && day > 1) || (month === 6 && day < 31) || (month < 6 && month >= 2)) {
            return true;
        }
        return false;
    }

    /**
     * @param {*} inputYear
     * @returns {Boolean}
     */
    isLeapYear(inputYear) {
        let year = inputYear;
        if (year === undefined) {
            year = this.year();
        }
        if (this.calendarType === "persian" && this.leapYearMode === "algorithmic") {
            return this.algorithms.leap_persian(year);
        }
        if (this.calendarType === "persian" && this.leapYearMode === "astronomical") {
            return this.algorithms.leap_persiana(year);
        } else if (this.calendarType === "gregorian") {
            return this.algorithms.leap_gregorian(year);
        }
    }

    /**
     * @param {*} yearInput
     * @param {*} monthInput
     * @returns {Number}
     */
    daysInMonth(yearInput, monthInput) {
        const year = yearInput ? yearInput : this.year(),
            month = monthInput ? monthInput : this.month();
        if (this.calendarType === "persian") {
            if (month < 1 || month > 12) return 0;
            if (month < 7) return 31;
            if (month < 12) return 30;
            if (this.isLeapYear(year)) {
                return 30;
            }
            return 29;
        }
        if (this.calendarType === "gregorian") {
            return new Date(year, month, 0).getDate();
        }
    }

    /**
     * @description Return Native Javascript Date
     * @returns {*|PersianDate.gDate}
     */
    toDate() {
        return this.State.gDate;
    }

    /**
     * @description Returns Array Of Persian Date
     * @returns {Array}
     */
    toArray() {
        return [this.year(), this.month(), this.date(), this.hour(), this.minute(), this.second(), this.millisecond()];
    }

    /**
     * You may set format number to persian globally or with
     * this class.
     *
     * @returns defaul format number
     */
    formatNumber() {
        // If default conf dosent set follow golbal config
        if (this.formatPersian === "_default") {
            return window.formatPersian;
        } else if (typeof this.formatPersian === "boolean") {
            return this.formatPersian;
        }
        Error('Invalid Config "formatPersian" !!');
    }

    /**
     * @param {*} pattern to print
     * @returns {*}
     */
    format(pattern) {
        if (this.State.isInvalidDate) {
            return false;
            // TODO: maso, 2023: logs warning
        }

        const numberingSystem = "persian";
        const outputCalendar = fromCalendartype(this.calendarType);

        return DateTime.fromMillis(this.valueOf(), {
            // Zone,
            // locale
            outputCalendar,
            numberingSystem,
        }).toFormat(pattern);
    }

    /**
     * @param {*} key
     * @param {*} val
     * @returns {PersianDate}
     */
    add(key, val) {
        let value = val;
        if (value === 0) {
            return this;
        }
        const unit = normalizeDuration(key, value).unit,
            arr = this.toArray();
        value = normalizeDuration(key, value).value;
        if (unit === "year") {
            let normalizedDate = arr[2];
            const monthDays = this.daysInMonth(arr[0] + value, arr[1]);
            if (arr[2] > monthDays) {
                normalizedDate = monthDays;
            }
            const tempDate = new PersianDate([
                arr[0] + value,
                arr[1],
                normalizedDate,
                arr[3],
                arr[4],
                arr[5],
                arr[6],
                arr[7],
            ]);
            return tempDate;
        }
        if (unit === "month") {
            let tempYear = Math.floor(value / 12);
            const remainingMonth = value - tempYear * 12;
            let calcedMonth = null;
            if (arr[1] + remainingMonth > 12) {
                tempYear += 1;
                calcedMonth = arr[1] + remainingMonth - 12;
            } else {
                calcedMonth = arr[1] + remainingMonth;
            }
            let normalizaedDate = arr[2];
            const tempDateArray = new PersianDate([
                arr[0] + tempYear,
                calcedMonth,
                1,
                arr[3],
                arr[4],
                arr[5],
                arr[6],
                arr[7],
            ]).toArray();
            const monthDays = this.daysInMonth(arr[0] + tempYear, calcedMonth);
            if (arr[2] > monthDays) {
                normalizaedDate = monthDays;
            }
            return new PersianDate([
                tempDateArray[0],
                tempDateArray[1],
                normalizaedDate,
                tempDateArray[3],
                tempDateArray[4],
                tempDateArray[5],
                tempDateArray[6],
                tempDateArray[7],
            ]);
        }
        if (unit === "day") {
            const calcedDay = new PersianDate(this.valueOf()).hour(12),
                newMillisecond = calcedDay.valueOf() + value * 86400000,
                newDate = new PersianDate(newMillisecond);
            return newDate.hour(arr[3]);
        }
        if (unit === "week") {
            const calcedDay = new PersianDate(this.valueOf()).hour(12),
                newMillisecond = calcedDay.valueOf() + 7 * value * 86400000,
                newDate = new PersianDate(newMillisecond);
            return newDate.hour(arr[3]);
        }
        if (unit === "hour") {
            const newMillisecond = this.valueOf() + value * 3600000;
            return this.unix(newMillisecond / 1000);
        }
        if (unit === "minute") {
            const newMillisecond = this.valueOf() + value * 60000;
            return this.unix(newMillisecond / 1000);
        }
        if (unit === "second") {
            const newMillisecond = this.valueOf() + value * 1000;
            return this.unix(newMillisecond / 1000);
        }
        if (unit === "millisecond") {
            const newMillisecond = this.valueOf() + value;
            return this.unix(newMillisecond / 1000);
        }
        return this._getSyncedClass(this.valueOf());
    }

    /**
     * @param {*} key
     * @param {*} value
     * @returns {PersianDate}
     */
    subtract(key, value) {
        return this.add(key, value * -1);
    }

    /**
     * Check if a date is same as b
     * @param {*} dateA
     * @param {*} dateB
     * @since 1.0.0
     * @returns {Boolean}
     * @static
     */
    static isSameDay(dateA, dateB) {
        return (
            dateA &&
            dateB &&
            dateA.date() === dateB.date() &&
            dateA.year() === dateB.year() &&
            dateA.month() === dateB.month()
        );
    }

    /**
     * @param {*} dateB
     * @since 1.0.0
     * @returns {PersianDate|*|Boolean}
     */
    isSameDay(dateB) {
        return (
            this &&
            dateB &&
            this.date() === dateB.date() &&
            this.year() === dateB.year() &&
            this.month() === dateB.month()
        );
    }

    /**
     * @desc check if a month is same as b
     * @param {Date} dateA
     * @param {Date} dateB
     * @returns {Boolean}
     * @since 1.0.0
     * @static
     */
    static isSameMonth(dateA, dateB) {
        return dateA && dateB && dateA.year() === dateB.year() && dateA.month() === dateB.month();
    }

    /**
     * @desc check two for month similarity
     * @param {*} dateB
     * @since 1.0.0
     * @returns {*|Boolean}
     */
    isSameMonth(dateB) {
        return this && dateB && this.year() === dateB.year() && this.month() === dateB.month();
    }
}

PersianDate.calendarType = "persian";
PersianDate.leapYearMode = "astronomical";
PersianDate.localType = "fa";
