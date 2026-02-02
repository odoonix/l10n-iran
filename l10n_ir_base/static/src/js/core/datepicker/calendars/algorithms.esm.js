/** @odoo-module **/

import {ASTRO} from "./astro.esm";
import {Container as State} from "./on.esm";

export class Algorithms {
    constructor(parent) {
        this.parent = parent;
        this.ASTRO = new ASTRO();
        this.State = new State();
        /*  You may notice that a variety of array variables logically local
         to functions are declared globally here.  In JavaScript, construction
         of an array variable from source code occurs as the code is
         interpreted.  Making these variables pseudo-globals permits us
         to avoid overhead constructing and disposing of them in each
         call on the function in which whey are used.  */
        // TODO this block didnt used in main agorithm
        // Julian date of Gregorian epoch: 0000-01-01
        this.J0000 = 1721424.5;
        // Julian date at Unix epoch: 1970-01-01
        this.J1970 = 2440587.5;
        // Epoch of Modified Julian Date system
        this.JMJD = 2400000.5;
        this.NormLeap = [false, true];
        // TODO END
        this.GREGORIAN_EPOCH = 1721425.5;
        this.PERSIAN_EPOCH = 1948320.5;
    }

    /**
     * @desc LEAP_GREGORIAN  --  Is a given year in the Gregorian calendar a leap year ?
     * @param {Number} year
     * @returns {Boolean}
     */
    leap_gregorian(year) {
        return year % 4 === 0 && !(year % 100 === 0 && year % 400 !== 0);
    }

    /**
     * @desc Determine Julian day number from Gregorian calendar date
     * @param {*} year
     * @param {*} month
     * @param {*} day
     * @returns generated value
     */
    gregorian_to_jd(year, month, day) {
        return (
            this.GREGORIAN_EPOCH -
            1 +
            365 * (year - 1) +
            Math.floor((year - 1) / 4) +
            -Math.floor((year - 1) / 100) +
            Math.floor((year - 1) / 400) +
            Math.floor((367 * month - 362) / 12 + (month <= 2 ? 0 : this.leap_gregorian(year) ? -1 : -2) + day)
        );
    }

    /**
     * @desc Calculate Gregorian calendar date from Julian day
     * @param {*} jd
     * @returns generated value
     */
    jd_to_gregorian(jd) {
        const wjd = Math.floor(jd - 0.5) + 0.5;
        const depoch = wjd - this.GREGORIAN_EPOCH;
        const quadricent = Math.floor(depoch / 146097);
        const dqc = this.ASTRO.mod(depoch, 146097);
        const cent = Math.floor(dqc / 36524);
        const dcent = this.ASTRO.mod(dqc, 36524);
        const quad = Math.floor(dcent / 1461);
        const dquad = this.ASTRO.mod(dcent, 1461);
        const yindex = Math.floor(dquad / 365);
        let year = quadricent * 400 + cent * 100 + quad * 4 + yindex;
        if (!(cent === 4 || yindex === 4)) {
            year++;
        }
        const yearday = wjd - this.gregorian_to_jd(year, 1, 1);
        const leapadj = wjd < this.gregorian_to_jd(year, 3, 1) ? 0 : this.leap_gregorian(year) ? 1 : 2;
        const month = Math.floor(((yearday + leapadj) * 12 + 373) / 367);
        const day = wjd - this.gregorian_to_jd(year, month, 1) + 1;

        return [year, month, day];
    }

    /**
     * @param {*} year
     */
    //    leap_julian (year) {
    //        return this.ASTRO.mod(year, 4) === ((year > 0) ? 0 : 3);
    //    }

    /**
     * @desc Calculate Julian calendar date from Julian day
     * @param {*} td
     */
    //    jd_to_julian (td) {
    //        let z, a, b, c, d, e, year, month, day;
    //
    //        td += 0.5;
    //        z = Math.floor(td);
    //
    //        a = z;
    //        b = a + 1524;
    //        c = Math.floor((b - 122.1) / 365.25);
    //        d = Math.floor(365.25 * c);
    //        e = Math.floor((b - d) / 30.6001);
    //
    //        month = Math.floor((e < 14) ? (e - 1) : (e - 13));
    //        year = Math.floor((month > 2) ? (c - 4716) : (c - 4715));
    //        day = b - d - Math.floor(30.6001 * e);
    //
    //        /*  If year is less than 1, subtract one to convert from
    //         a zero based date system to the common era system in
    //         which the year -1 (1 B.C.E) is followed by year 1 (1 C.E.).  */
    //
    //        if (year < 1) {
    //            year--;
    //        }
    //
    //        return [year, month, day];
    //    }

    /**
     * @desc TEHRAN_EQUINOX  --  Determine Julian day and fraction of the
     * March equinox at the Tehran meridian in
     * a given Gregorian year.
     *
     * @param {*} year
     * @returns {*}
     */
    tehran_equinox(year) {
        //  March equinox in dynamical time
        const equJED = this.ASTRO.equinox(year, 0);

        //  Correct for delta T to obtain Universal time
        const equJD = equJED - this.ASTRO.deltat(year) / (24 * 60 * 60);

        //  Apply the equation of time to yield the apparent time at Greenwich
        const equAPP = equJD + this.ASTRO.equationOfTime(equJED);

        // Finally, we must correct for the constant difference between
        // the Greenwich meridian andthe time zone standard for
        // Iran Standard time, 52°30' to the East.
        const dtTehran = (52 + 30 / 60.0 + 0 / (60.0 * 60.0)) / 360;
        const equTehran = equAPP + dtTehran;

        return equTehran;
    }

    /**
     * @desc TEHRAN_EQUINOX_JD  --  Calculate Julian day during which the
     March equinox, reckoned from the Tehran
     meridian, occurred for a given Gregorian
     year.
     * @param {*} year
     * @returns {*}
     */
    tehran_equinox_jd(year) {
        return Math.floor(this.tehran_equinox(year));
    }

    /**
     * @desc  PERSIANA_YEAR  --  Determine the year in the Persian
     astronomical calendar in which a
     given Julian day falls.  Returns an
     array of two elements:

     [0]  Persian year
     [1]  Julian day number containing
     equinox for this year.
     * @param {*} jd
     * @returns {*}
     */
    persiana_year(jd) {
        let guess = this.jd_to_gregorian(jd)[0] - 2;
        let lasteq = this.tehran_equinox_jd(guess);
        while (lasteq > jd) {
            guess--;
            lasteq = this.tehran_equinox_jd(guess);
        }
        let nexteq = lasteq - 1;
        while (!(lasteq <= jd && jd < nexteq)) {
            lasteq = nexteq;
            guess++;
            nexteq = this.tehran_equinox_jd(guess);
        }
        const adr = Math.round((lasteq - this.PERSIAN_EPOCH) / this.ASTRO.TropicalYear) + 1;

        return [adr, lasteq];
    }

    /**
     * @desc Calculate date in the Persian astronomical
     * calendar from Julian day.
     *
     * @param {*} ijd
     * @returns {*}
     */
    jd_to_persiana(ijd) {
        const jd = Math.floor(ijd) + 0.5;
        const adr = this.persiana_year(jd);
        const year = adr[0];
        const equinox = adr[1];
        let day = Math.floor((jd - equinox) / 30) + 1;

        const yday = Math.floor(jd) - this.persiana_to_jd(year, 1, 1) + 1;
        const month = yday <= 186 ? Math.ceil(yday / 31) : Math.ceil((yday - 6) / 30);
        day = Math.floor(jd) - this.persiana_to_jd(year, month, 1) + 1;

        return [year, month, day];
    }

    /**
   * @desc Obtain Julian day from a given Persian
   astronomical calendar date.
  * @param {*} year
    * @param {*} month
    * @param {*} day
   * @returns {*}
     */
    persiana_to_jd(year, month, day) {
        let guess = this.PERSIAN_EPOCH - 1 + this.ASTRO.TropicalYear * (year - 1 - 1);
        let adr = [year - 1, 0];

        while (adr[0] < year) {
            adr = this.persiana_year(guess);
            guess = adr[1] + (this.ASTRO.TropicalYear + 2);
        }
        const equinox = adr[1];

        return equinox + (month <= 7 ? (month - 1) * 31 : (month - 1) * 30 + 6) + (day - 1);
    }

    /**
     * @desc Is a given year a leap year in the Persian astronomical calendar ?
     * @param {*} year
     * @returns {*}
     */
    leap_persiana(year) {
        return this.persiana_to_jd(year + 1, 1, 1) - this.persiana_to_jd(year, 1, 1) > 365;
    }

    /**
     * @desc Is a given year a leap year in the Persian calendar ?
     * also nasa use this algorithm https://eclipse.gsfc.nasa.gov/SKYCAL/algorithm.js search for 'getLastDayOfPersianMonth' and you can find it
     * @param {*} year
     * @returns {*}
     */
    leap_persian(year) {
        return ((((year - (year > 0 ? 474 : 473)) % 2820) + 474 + 38) * 682) % 2816 < 682;
    }

    /**
     * @desc Determine Julian day from Persian date
     * @param {*} year
     * @param {*} month
     * @param {*} day
     * @returns {*}
     */
    persian_to_jd(year, month, day) {
        const epbase = year - (year >= 0 ? 474 : 473);
        const epyear = 474 + this.ASTRO.mod(epbase, 2820);

        return (
            day +
            (month <= 7 ? (month - 1) * 31 : (month - 1) * 30 + 6) +
            Math.floor((epyear * 682 - 110) / 2816) +
            (epyear - 1) * 365 +
            Math.floor(epbase / 2820) * 1029983 +
            (this.PERSIAN_EPOCH - 1)
        );
    }

    /**
     * @desc Calculate Persian date from Julian day
     * @param {*} jd
     * @returns {*}
     */
    jd_to_persian(jd) {
        let ycycle = null,
            aux1 = null,
            aux2 = null;

        const njd = Math.floor(jd) + 0.5;

        const depoch = njd - this.persian_to_jd(475, 1, 1);
        const cycle = Math.floor(depoch / 1029983);
        const cyear = this.ASTRO.mod(depoch, 1029983);
        if (cyear === 1029982) {
            ycycle = 2820;
        } else {
            aux1 = Math.floor(cyear / 366);
            aux2 = this.ASTRO.mod(cyear, 366);
            ycycle = Math.floor((2134 * aux1 + 2816 * aux2 + 2815) / 1028522) + aux1 + 1;
        }
        let year = ycycle + 2820 * cycle + 474;
        if (year <= 0) {
            year--;
        }
        const yday = jd - this.persian_to_jd(year, 1, 1) + 1;
        const month = yday <= 186 ? Math.ceil(yday / 31) : Math.ceil((yday - 6) / 30);
        const day = jd - this.persian_to_jd(year, month, 1) + 1;
        return [year, month, day];
    }

    /**
     *
     * @param {*} weekday
     * @returns {*}
     */
    gWeekDayToPersian(weekday) {
        if (weekday + 2 === 8) {
            return 1;
        } else if (weekday + 2 === 7) {
            return 7;
        }
        return weekday + 2;
    }

    /**
     * @desc updateFromGregorian  --  Update all calendars from Gregorian.
     * "Why not Julian date?" you ask.  Because
     * starting from Gregorian guarantees we're
     * already snapped to an integral second, so
     * we don't get roundoff errors in other calendars.
     */
    updateFromGregorian() {
        let perscal = null;

        const year = this.State.gregorian.year;
        const mon = this.State.gregorian.month;
        const mday = this.State.gregorian.day;
        // This.State.gregorian.hour;
        const hour = 0;
        // This.State.gregorian.minute;
        const min = 0;
        // This.State.gregorian.second;
        const sec = 0;

        this.State.gDate = new Date(
            year,
            mon,
            mday,
            this.State.gregorian.hour,
            this.State.gregorian.minute,
            this.State.gregorian.second,
            this.State.gregorian.millisecond
        );

        if (this.parent._utcMode === false) {
            this.State.zone = this.State.gDate.getTimezoneOffset();
        }

        // Added for this algorithms cant parse 2016,13,32 successfully
        this.State.gregorian.year = this.State.gDate.getFullYear();
        this.State.gregorian.month = this.State.gDate.getMonth();
        this.State.gregorian.day = this.State.gDate.getDate();

        //  Update Julian day
        // ---------------------------------------------------------------------------
        const j = this.gregorian_to_jd(year, mon + 1, mday) + Math.floor(sec + 60 * (min + 60 * hour) + 0.5) / 86400.0;

        this.State.julianday = j;
        this.State.modifiedjulianday = j - this.JMJD;

        //  Update day of week in Gregorian box
        // ---------------------------------------------------------------------------
        let weekday = this.ASTRO.jwday(j);
        // Move to 1 indexed number
        this.State.gregorian.weekday = weekday + 1;

        //  Update leap year status in Gregorian box
        // ---------------------------------------------------------------------------
        this.State.gregorian.leap = this.NormLeap[this.leap_gregorian(year) ? 1 : 0];

        //  Update Julian Calendar
        // ---------------------------------------------------------------------------
        //        julcal = this.jd_to_julian(j);
        //
        //        this.State.juliancalendar.year = julcal[0];
        //        this.State.juliancalendar.month = julcal[1] - 1;
        //        this.State.juliancalendar.day = julcal[2];
        //        this.State.juliancalendar.leap = this.NormLeap[this.leap_julian(julcal[0]) ? 1 : 0];
        weekday = this.ASTRO.jwday(j);
        //        This.State.juliancalendar.weekday = weekday;

        //  Update Persian Calendar
        // ---------------------------------------------------------------------------
        if (this.parent.calendarType === "persian" && this.parent.leapYearMode === "algorithmic") {
            perscal = this.jd_to_persian(j);
            this.State.persian.year = perscal[0];
            this.State.persian.month = perscal[1] - 1;
            this.State.persian.day = perscal[2];
            this.State.persian.weekday = this.gWeekDayToPersian(weekday);
            this.State.persian.leap = this.NormLeap[this.leap_persian(perscal[0]) ? 1 : 0];
        }

        //  Update Persian Astronomical Calendar
        // ---------------------------------------------------------------------------
        if (this.parent.calendarType === "persian" && this.parent.leapYearMode === "astronomical") {
            perscal = this.jd_to_persiana(j);
            this.State.persianAstro.year = perscal[0];
            this.State.persianAstro.month = perscal[1] - 1;
            this.State.persianAstro.day = perscal[2];
            this.State.persianAstro.weekday = this.gWeekDayToPersian(weekday);
            this.State.persianAstro.leap = this.NormLeap[this.leap_persiana(perscal[0]) ? 1 : 0];
        }
        //  Update Gregorian serial number
        // ---------------------------------------------------------------------------
        if (this.State.gregserial.day !== null) {
            this.State.gregserial.day = j - this.J0000;
        }

        //  Update Unix time()
        // ---------------------------------------------------------------------------
        const utime = (j - this.J1970) * (60 * 60 * 24 * 1000);

        this.State.unixtime = Math.round(utime / 1000);
    }

    /**
     * @desc Perform calculation starting with a Gregorian date
     * @param {*} dateArray
     */
    calcGregorian(dateArray) {
        if (dateArray[0] || dateArray[0] === 0) {
            this.State.gregorian.year = dateArray[0];
        }
        if (dateArray[1] || dateArray[1] === 0) {
            this.State.gregorian.month = dateArray[1];
        }
        if (dateArray[2] || dateArray[2] === 0) {
            this.State.gregorian.day = dateArray[2];
        }
        if (dateArray[3] || dateArray[3] === 0) {
            this.State.gregorian.hour = dateArray[3];
        }
        if (dateArray[4] || dateArray[4] === 0) {
            this.State.gregorian.minute = dateArray[4];
        }
        if (dateArray[5] || dateArray[5] === 0) {
            this.State.gregorian.second = dateArray[5];
        }
        if (dateArray[6] || dateArray[6] === 0) {
            this.State.gregorian.millisecond = dateArray[6];
        }
        this.updateFromGregorian();
    }

    /**
     * @desc Perform calculation starting with a Julian date
     */
    calcJulian() {
        const j = this.State.julianday;
        const date = this.jd_to_gregorian(j);
        this.State.gregorian.year = date[0];
        this.State.gregorian.month = date[1] - 1;
        this.State.gregorian.day = date[2];
        //        This.State.gregorian.hour = this.pad(time[0], 2, " ");
        //        this.State.gregorian.minute = this.pad(time[1], 2, "0");
        //        this.State.gregorian.second = this.pad(time[2], 2, "0");
        this.updateFromGregorian();
    }

    /**
     * @desc Set Julian date and update all calendars
     * @param {*} j
     */
    setJulian(j) {
        this.State.julianday = j;
        this.calcJulian();
    }

    /**
     * @desc  Update from Persian calendar
     * @param {*} dateArray
     */
    calcPersian(dateArray) {
        if (dateArray[0] || dateArray[0] === 0) {
            this.State.persian.year = dateArray[0];
        }
        if (dateArray[1] || dateArray[1] === 0) {
            this.State.persian.month = dateArray[1];
        }
        if (dateArray[2] || dateArray[2] === 0) {
            this.State.persian.day = dateArray[2];
        }
        if (dateArray[3] || dateArray[3] === 0) {
            this.State.gregorian.hour = dateArray[3];
        }
        if (dateArray[4] || dateArray[4] === 0) {
            this.State.gregorian.minute = dateArray[4];
        }
        if (dateArray[5] || dateArray[5] === 0) {
            this.State.gregorian.second = dateArray[5];
        }
        if (dateArray[6] || dateArray[6] === 0) {
            this.State.gregorian.millisecond = dateArray[6];
        }

        this.setJulian(this.persian_to_jd(this.State.persian.year, this.State.persian.month, this.State.persian.day));
    }

    /**
     * @desc Update from Persian astronomical calendar
     * @param {*} dateArray
     */
    calcPersiana(dateArray) {
        if (dateArray[0] || dateArray[0] === 0) {
            this.State.persianAstro.year = dateArray[0];
        }
        if (dateArray[1] || dateArray[1] === 0) {
            this.State.persianAstro.month = dateArray[1];
        }
        if (dateArray[2] || dateArray[2] === 0) {
            this.State.persianAstro.day = dateArray[2];
        }

        if (dateArray[3] || dateArray[3] === 0) {
            this.State.gregorian.hour = dateArray[3];
        }
        if (dateArray[4] || dateArray[4] === 0) {
            this.State.gregorian.minute = dateArray[4];
        }
        if (dateArray[5] || dateArray[5] === 0) {
            this.State.gregorian.second = dateArray[5];
        }
        if (dateArray[6] || dateArray[6] === 0) {
            this.State.gregorian.millisecond = dateArray[6];
        }
        this.setJulian(
            this.persiana_to_jd(
                this.State.persianAstro.year,
                this.State.persianAstro.month,
                this.State.persianAstro.day + 0.5
            )
        );
    }
}
