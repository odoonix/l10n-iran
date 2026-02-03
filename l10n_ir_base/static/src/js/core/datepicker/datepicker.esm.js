/** @odoo-module **/
import {Component, onMounted, useRef, useState} from "@odoo/owl";
import {PersianDate, toCalendartype} from "./calendars/pDate.esm";
import {formatDate, formatDateTime} from "@web/core/l10n/dates";

import {localization} from "@web/core/l10n/localization";
import {uuid} from "@web/views/utils";

const {DateTime, Settings} = luxon;

const YEARS_VIEW_COUNT = 12;
const UNIXTIME_DAY_LENGTH = 86400000;

function isMobile() {
    let check = false;
    (function (a) {
        if (
            /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(
                a
            ) ||
            /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw-(n|u)|c55\/|capi|ccwa|cdm-|cell|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do(c|p)o|ds(12|-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(-|_)|g1 u|g560|gene|gf-5|g-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd-(m|p|t)|hei-|hi(pt|ta)|hp( i|ip)|hs-c|ht(c(-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac( |-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h-|oo|p-)|sdk\/|se(c(-|0|1)|47|mc|nd|ri)|sgh-|shar|sie(-|m)|sk-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl-|tdg-|tel(i|m)|tim-|t-mo|to(pl|sh)|ts(70|m-|m3|m5)|tx-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-|your|zeto|zte-/i.test(
                a.substr(0, 4)
            )
        )
            check = true;
    })(navigator.userAgent || navigator.vendor || window.opera);
    return check;
}

/**
 * Datepicker component
 *
 * This is a light and zero dependent datepicker which is fully implemented
 * based on OWL 2.
 * It amed to be a multi calendar support.
 *
 * Current version is desinged based on persian-pwt lib, but we are about to
 * migrate to luxon.
 *
 * Supported Calendar: persian, gregorian
 *
 * ## Day identifier
 *
 * We need to indecate a day in datepicker. For exame we need to know if
 * a widget on view is set today. Due to this requirement we define a day identifier
 * as: Unix Timestampl of 12 oclock in UTC Zone of a day is its identifier.
 *
 */
export class DatePicker extends Component {
    setup() {
        this.date = useState({
            year: 1,
            month: 1,
            day: 1,
            hour: 1,
            hour12: 1,
            minute: 2,
            second: 3,
            meridian: 0,

            // Unixtimestamp of in UTC Zone
            unixDate: 0,
            // See day definistion
            selectedDay: 0,
        });

        this.state = useState({
            calendarType: toCalendartype(Settings.defaultOutputCalendar || "persian"),
            viewMode: "day",
            hide: false,
            mobileView: true,
            // ID of today
            today: 0,
        });

        this.datePickerId = `persianDateInstance-${uuid()}`;

        // <- Root element
        this.rootRef = useRef("root");
        // <- Show data
        this.inputRef = useRef("input");
        // <- date picker container
        this.$container = useRef("container");

        this.setViewDateTime("unix", this.persianDatePars(this.props.date.valueOf()));
        this.state.mobileView = isMobile() && this.props.responsive;
        this.state.today = this.persianDatePars(new Date().valueOf())
            .hour(12)
            .minute(0)
            .second(0)
            .millisecond(0)
            .valueOf();
        // LoadState
        this.updateViewModel();
        this.hide = true;

        onMounted(() => {
            this.updateInput();

            // Observer changes
            const config = {attributes: true, childList: true, subtree: true};
            const observer = new MutationObserver(() => {
                this.setPickerBoxPosition();
            });
            observer.observe(this.inputRef.el, config);
        });
    }
    // ---------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------

    onInputClick() {
        if (this.hide) {
            this.hide = false;
        }
    }

    /**
     * Called either when the input value has changed or when the boostrap
     * datepicker is closed. The onDateTimeChanged prop is only called if the
     * date value has changed.
     * @param {Object} [params={}]
     * @param {Boolean} [params.useStatic]
     */
    onDateChange() {
        const unixtime = this.persianDatePars([
            this.date.year,
            this.date.month,
            this.date.day,
            this.date.hour,
            this.date.minute,
            this.date.second,
        ]).valueOf();
        const parsedDate = DateTime.fromMillis(unixtime);
        // Const { value } = this.inputRef.el;
        // const options = this.getOptions(useStatic);
        // const parsedDate = this.parseValue(value, options)[0];
        // this.state.warning = parsedDate && parsedDate > DateTime.local();
        // if (value && !parsedDate) {
        //     // Reset to default (= given) date.
        this.updateInput();
        // }
        // if (parsedDate !== null && !areDateEquals(this.date, parsedDate)) {
        this.props.onDateTimeChanged(parsedDate);
        // }
    }

    /**
     * Remove datepicker container element from dom
     *
     * TODO: replace with owl
     */
    destroy() {
        this.$container.remove();
    }

    /**
     * Sets datepicker container element based on <input/> element position
     *
     * @returns true if if it is success
     */
    setPickerBoxPosition() {
        if (!this.state.hide) {
            return;
        }
        const inputPosition = this.inputRef.el.getInputPosition();
        const inputSize = this.inputRef.el.getInputSize();

        if (isMobile() && this.props.responsive) {
            return false;
        }

        this.$container.css({
            left: inputPosition.left + "px",
            top: inputSize.height + inputPosition.top + "px",
        });
    }

    /**
     * Show datepicker container element
     */
    show() {
        this.state.hide = false;
        this.setPickerBoxPosition();
    }

    /**
     * Gets current hide state.
     */
    get hide() {
        return this.state.hide;
    }

    /**
     * Changes the hide state
     *
     * If the hide is true, then the datepicker disaper.
     *
     * @param {*} value to set as the hide state
     */
    set hide(value) {
        this.state.hide = value;
    }

    /**
     * @desc toggle datepicker container element
     */
    toggle() {
        this.state.hide = !this.state.hide;
    }

    /**
     * Return navigator switch text
     *
     * @returns {String}
     */
    genNavSwitchText() {
        let output = "??";
        switch (this.state.viewMode) {
            case "day":
                output = this.titleFormatter(this.date.unixDate, this.props.dayPicker.titleFormat);
                break;
            case "month":
                output = this.titleFormatter(this.date.unixDate, this.props.monthPicker.titleFormat);
                break;
            case "year":
                output = this.titleFormatter(this.date.unixDate, this.props.yearPicker.titleFormat);
                break;
        }
        return output;
    }

    titleFormatter(unix, titleFormat) {
        const titleDate = this.persianDatePars(unix);
        return titleDate.format(titleFormat);
    }

    /**
     * Generate titles of a week days in current calendar
     *
     * @returns {{enabled: Boolean, list: (*|Array)}}
     * @private
     */
    genWeekViewModel() {
        return {
            enabled: true,
            list: this.persianDatePars().rangeName().weekdaysMin,
        };
    }

    get currentCalendarType() {
        return toCalendartype(
            this.state.calendarType || this.props.calendarType || Settings.defaultOutputCalendar || "persian"
        );
    }

    get currentCalendar() {
        return this.props.calendar[this.currentCalendarType];
    }

    get altCalendarType() {
        // TODO: suport dynamic types
        return this.currentCalendarType === "persian" ? "gregorian" : "persian";
    }

    get altCalendar() {
        return this.props.calendar[this.altCalendarType];
    }

    /** ****************************************************
     *                 Filter date                    *
     ******************************************************/
    /**
     * @desc check year is accessible
     * @param {Number} year - year number
     * @returns {Boolean}
     */
    checkYearAccess(year) {
        // TODO: maso, 2023: support year access
        return year > 0;
    }

    /**
     * @desc check month is accessible
     * @param {Number} month - month number
     * @returns {Boolean}
     */
    checkMonthAccess(month) {
        // TODO: maso, 2023: support month access
        return month > 0;
    }

    /**
     * @desc check day is accessible
     * @param {Number} unixtimespan - month number
     * @returns {Boolean}
     */
    checkDayAccess(unixtimespan) {
        if (this.props.filetredDate) {
            return true;
        }
        const minDate = this.persianDatePars(this.props.minDate | Number.MIN_SAFE_INTEGER)
            .startOf("day")
            .valueOf();
        const maxDate = this.persianDatePars(this.props.maxDate | Number.MAX_SAFE_INTEGER)
            .endOf("day")
            .valueOf();
        return unixtimespan > minDate || unixtimespan > maxDate;
    }

    /** ****************************************************
     *                 Utilities                    *
     ******************************************************/

    persianDatePars(input) {
        const cp = PersianDate.toCalendar(this.currentCalendarType);
        const calendar = this.props.calendar[this.currentCalendarType];
        if (calendar.leapYearMode) {
            cp.toLeapYearMode(calendar.leapYearMode);
        }
        const output = new cp(input);
        return output.toLocale(calendar.local);
    }

    //* ************************************************
    // View data gen
    //* ************************************************
    updateViewModel() {
        this.state.weekdays = this.genWeekViewModel();
        this.state.days = this.genDayViewModel();
        this.state.month = this.genMonthViewModel();
        this.state.year = this.genYearViewModel();
        this.state.navigatorTitle = this.genNavSwitchText();

        return this;
    }

    /**
     * @returns {{enabled: Boolean, viewMode: Boolean, list: Array}}
     */
    genYearViewModel() {
        const template = {
            enabled: this.props.yearPicker.enabled,
            list: [],
        };
        // Make performance better
        if (!template.enabled) {
            return template;
        }
        /**
         * @description Generate years list based on viewState year
         * @return ['1380',n+12,'1392']
         */
        const center = parseInt(this.date.year / YEARS_VIEW_COUNT, 10) * YEARS_VIEW_COUNT;
        const objectDate = this.persianDatePars();
        for (let i = 0; i < YEARS_VIEW_COUNT; i++) {
            const year = center + i;
            objectDate.year([year]);
            template.list.push({
                title: objectDate.format("yyyy"),
                enabled: this.checkYearAccess(year),
                index: year,
                selected: this.date.year === year,
            });
        }
        return template;
    }

    /**
     * @private
     * @returns {{enabled: Boolean, viewMode: Boolean, list: Array}}
     */
    genMonthViewModel() {
        const template = {
            enabled: this.props.monthPicker.enabled,
            list: [],
        };
        // Make performance better
        if (!template.enabled) {
            return template;
        }

        const that = this;
        for (const [index, month] of that.persianDatePars().rangeName().months.entries()) {
            template.list.push({
                title: month,
                enabled: this.checkMonthAccess(index),
                year: this.date.year,
                index: index + 1,
                selected: this.date.month === index + 1,
            });
        }
        return template;
    }

    /**
     * @private
     * @returns {Object}
     */
    genDayViewModel() {
        const WEEK_COUNT = 6;
        const template = {
            enabled: false,
            viewMode: "day",
            list: [
                ["null", "null", "null", "null", "null", "null", "null"],
                ["null", "null", "null", "null", "null", "null", "null"],
                ["null", "null", "null", "null", "null", "null", "null"],
                ["null", "null", "null", "null", "null", "null", "null"],
                ["null", "null", "null", "null", "null", "null", "null"],
                ["null", "null", "null", "null", "null", "null", "null"],
            ],
        };

        if (!this.props.dayPicker.enabled || this.state.viewMode !== "day") {
            return template;
        }

        // Log('if you see this many time your code has performance issue');
        const viewMonth = this.date.month;
        const viewYear = this.date.year;

        // This is today identifier
        const dateObject = this.persianDatePars(this.date.unixDate).hour(12).minute(0).second(0).millisecond(0);

        const firstWeekDayOfMonth = dateObject.getFirstWeekDayOfMonth(viewYear, viewMonth) - 1;
        const daysCount = dateObject.daysInMonth(viewYear, viewMonth);

        const calendarType = this.currentCalendarType;
        const calendarLocal = this.currentCalendar.local;
        const altCalendarType = this.altCalendarType;
        const altCalendarLocal = this.altCalendar.local;

        // Day length in unix time 24*60*60 == 86400000
        const startUnixTime = dateObject.date(1).valueOf();
        const endUnixTime = startUnixTime + daysCount * UNIXTIME_DAY_LENGTH;
        let currentUnixTime = startUnixTime - firstWeekDayOfMonth * UNIXTIME_DAY_LENGTH;
        for (let week = 0; week < WEEK_COUNT; week++) {
            for (let day = 0; day < 7; day++) {
                const calcedDate = new PersianDate(currentUnixTime).toCalendar(calendarType).toLocale(calendarLocal);
                template.list[week][day] = {
                    title: calcedDate.format("dd"),
                    index: calcedDate.date(),
                    alterCalTitle: new PersianDate(currentUnixTime)
                        .toCalendar(altCalendarType)
                        .toLocale(altCalendarLocal)
                        .format("dd"),
                    // Day identifier
                    dataUnix: currentUnixTime,
                    otherMonth: currentUnixTime < startUnixTime || currentUnixTime > endUnixTime,
                    // TODO: make configurable
                    enabled: this.checkDayAccess(currentUnixTime),
                    selected: currentUnixTime === this.date.selectedDay,
                    today: currentUnixTime === this.state.today,
                };
                currentUnixTime += UNIXTIME_DAY_LENGTH;
            }
        }

        return template;
    }

    /**
     * Updates the input element with the current formatted date value.
     */
    updateInput() {
        const condition = this.formattedValue;
        if (condition) {
            this.inputRef.el.value = condition;
            if (this.props.onUpdateInput) {
                this.props.onUpdateInput(condition);
            }
        } else {
            this.inputRef.el.value = "";
        }
    }

    get formattedValue() {
        const value = DateTime.fromMillis(this.date.unixDate);
        return this.isDateTime ? formatDateTime(value, {format: localization.dateTimeFormat}) : formatDate(value);
    }

    /** ****************************************************
     *                 Model manupulation                 *
     ******************************************************/
    yearUp() {
        const step = this.props.yearPicker.step | 1;
        const newUnixtimestamp = this.persianDatePars(this.date.unixDate).add("year", step).valueOf();
        this.setViewDateTime("unix", newUnixtimestamp);
    }

    yearDown() {
        const step = this.props.yearPicker.step | 1;
        const newUnixtimestamp = this.persianDatePars(this.date.unixDate).subtract("year", step).valueOf();
        this.setViewDateTime("unix", newUnixtimestamp);
    }

    goToYear(year) {
        const unixtimestamp = this.persianDatePars(this.date.unixDate).year(year).valueOf();
        this.state.viewMode = "month";
        this.setViewDateTime("unix", unixtimestamp);
    }

    monthUp() {
        const step = this.props.monthPicker.step | 1;
        const newUnixtimestamp = this.persianDatePars(this.date.unixDate).add("month", step).valueOf();
        this.setViewDateTime("unix", newUnixtimestamp);
    }

    monthDown() {
        const step = this.props.monthPicker.step | 1;
        const newUnixtimestamp = this.persianDatePars(this.date.unixDate).subtract("month", step).valueOf();
        this.setViewDateTime("unix", newUnixtimestamp);
    }

    goToMonth(month) {
        const unixtimestamp = this.persianDatePars(this.date.unixDate).month(month).valueOf();
        this.state.viewMode = "day";
        this.setViewDateTime("unix", unixtimestamp);
    }

    gotoDay(day) {
        this.setViewDateTime("day", day);
    }

    /**
     * @desc set time up depend to timekey
     * @param {String} timekey - accept hour, minute,second
     * @public
     */
    timeUp(timekey) {
        if (this.props.timePicker[timekey] === undefined) {
            return;
        }
        let step = 12,
            t = null;
        if (timekey === "meridian") {
            if (this.date.meridian === "PM") {
                t = this.persianDatePars(this.date.unixDate).add("hour", step).valueOf();
            } else {
                t = this.persianDatePars(this.date.unixDate).subtract("hour", step).valueOf();
            }
            this.meridianToggle();
        } else {
            step = this.props.timePicker[timekey].step;
            t = this.persianDatePars(this.date.unixDate).add(timekey, step).valueOf();
        }

        this.setViewDateTime("unix", t);
    }

    /**
     * @desc sets time down depend to timekey
     *
     * It decrements timekey by a step value. The step value depends on
     * props (by default 1).
     *
     * @param {String} timekey - accept hour, minute,second
     * @public
     */
    timeDown(timekey) {
        if (this.props.timePicker[timekey] === undefined) {
            return;
        }
        let step = 12,
            t = null;
        if (timekey === "meridian") {
            if (this.date.meridian === "AM") {
                t = this.persianDatePars(this.date.unixDate).add("hour", step).valueOf();
            } else {
                t = this.persianDatePars(this.date.unixDate).subtract("hour", step).valueOf();
            }
            this.meridianToggle();
        } else {
            step = this.props.timePicker[timekey].step;
            t = this.persianDatePars(this.date.unixDate).subtract(timekey, step).valueOf();
        }
        this.setViewDateTime("unix", t);
    }

    /**
     *
     * @param {String} key -  accept date, month, year, hour, minute, second
     * @param {Number} value
     * @returns this object
     */
    setViewDateTime(key, value) {
        switch (key) {
            case "unix": {
                const pd = this.persianDatePars(value);
                this.date.year = pd.year();
                this.date.month = pd.month();
                this.date.day = pd.date();
                this.date.hour = pd.hour();
                this.date.minute = pd.minute();
                this.date.second = pd.second();
                break;
            }
            case "year":
                this.date.year = value;
                break;
            case "month":
                this.date.month = value;
                break;
            case "day":
                this.date.day = value;
                break;
            case "hour":
                this.date.hour = value;
                break;
            case "minute":
                this.date.minute = value;
                break;
            case "second":
                this.date.second = value;
                break;
        }

        // Update states
        const dateObject = this.persianDatePars([
            this.date.year,
            this.date.month,
            this.date.day,
            this.date.hour,
            this.date.minute,
            this.date.second,
        ]);
        this.date.year = dateObject.year();
        this.date.month = dateObject.month();
        this.date.day = dateObject.date();
        this.date.hour = dateObject.hour();
        this.date.hour12 = dateObject.format("hh");
        this.date.minute = dateObject.minute();
        this.date.second = dateObject.second();
        this.date.unixDate = dateObject.valueOf();
        this.date.meridian = dateObject.format("a");
        this.date.selectedDay = dateObject.hour(12).minute(0).second(0).millisecond(0).valueOf();

        return this.updateViewModel();
    }

    /** ****************************************************
     *                Navigator Support                   *
     ******************************************************/
    navigateNext() {
        switch (this.state.viewMode) {
            case "day":
                break;
            case "month":
                this.monthUp();
                break;
            case "year":
                this.yearUp();
                break;
        }
    }

    /**
     * Switch dat view mode.
     *
     * @returns current datepicker
     */
    toggleNavigate() {
        // XXX: maso, 2023: check if view is enabled by props
        switch (this.state.viewMode) {
            case "day":
                // If props.monthPicker.enabled
                this.state.viewMode = "month";
                break;
            case "month":
                // If props.yearPicker.enabled
                this.state.viewMode = "year";
                break;
            default:
                // If props.dayPicker.enabled
                this.state.viewMode = "day";
        }
        // Based on view mode, some data may change.
        this.updateViewModel();
        return this;
    }

    navigatePrevious() {
        switch (this.state.viewMode) {
            case "day":
                break;
            case "month":
                this.monthDown();
                break;
            case "year":
                this.yearDown();
                break;
        }
    }

    /** ****************************************************
     *                 Toolbox Support                    *
     ******************************************************/
    /**
     * Toggles calendar type.
     *
     * In the current version two types are supported. Simple
     * toggle between them.
     *
     * @returns current datepicker
     */
    toggleCalendartype() {
        this.state.calendarType = this.state.calendarType === "persian" ? "gregorian" : "persian";
        this.state.local = this.props.calendar[this.state.calendarType].local;
        this.setViewDateTime("unix", this.date.unixDate);
        return this;
    }

    /**
     * Sets current date time as the value.
     *
     * @returns the DatePikcer itself
     */
    setTodayDate() {
        this.setViewDateTime("unix", DateTime.now().toMillis());
        return this;
    }

    /**
     * Sets current data value to the target container.
     *
     * @returns DatePicker
     */
    submitValue() {
        this.onDateChange({useStatic: true});
        this.hide = true;
        return this;
    }

    /**
     * Ignores changes and sets the original value as result.
     *
     * @returns DatePicker
     */
    cancel() {
        return (this.hide = true);
    }

    /** ****************************************************
     *                 Time Support                    *
     ******************************************************/

    /**
     * desc change meridian state
     *
     * @returns this object
     */
    meridianToggle() {
        if (this.date.meridian === "AM") {
            this.date.meridian = "PM";
        } else {
            this.date.meridian = "AM";
        }
        return this;
    }

    hourDown() {
        return this.timeDown("hour");
    }

    hourUp() {
        return this.timeUp("hour");
    }

    minuteUp() {
        return this.timeUp("minute");
    }

    minuteDown() {
        return this.timeDown("minute");
    }

    secondUp() {
        return this.timeUp("second");
    }

    secondDown() {
        return this.timeDown("second");
    }

    meridianUp() {
        return this.timeUp("meridian");
    }

    meridianDown() {
        return this.timeDown("meridian");
    }
}

DatePicker.template = "l10n_ir_web.DatePicker";
DatePicker.defaultProps = {
    // Input props defaults
    readonly: false,

    // Data validation
    // format: "yyyy/MM/dd",

    // Defualt events
    onDateTimeChanged: null,
    onInput: null,
    onUpdateInput: null,
    revId: 0,

    filetredDate: false,
    // CalendarType: 'persian',
    calendar: {
        persian: {
            local: "fa",
            showHint: true,
            leapYearMode: "algorithmic",
        },
        gregorian: {
            local: "en",
            showHint: true,
        },
    },

    // View defaults
    onlyTimePicker: false,
    altCalendarShowHint: true,
    responsive: true,
    isInline: false,
    timePicker: {
        enabled: false,
        step: 1,
        hour: {
            enabled: true,
            step: 1,
        },
        minute: {
            enabled: true,
            step: 1,
        },
        second: {
            enabled: true,
            step: 1,
        },
        meridian: {
            enabled: false,
        },
    },
    dayPicker: {
        enabled: true,
        titleFormat: "yyyy MMMM",
        step: 1,
    },
    monthPicker: {
        enabled: true,
        titleFormat: "yyyy",
        step: 1,
    },
    yearPicker: {
        enabled: true,
        titleFormat: "yyyy",
        step: 1,
    },
    navigator: {
        enabled: true,
        switch: {
            enabled: true,
        },
    },
    toolbox: {
        enabled: true,
        submitButton: {
            enabled: true,
        },
        todayButton: {
            enabled: true,
        },
        calendarSwitch: {
            enabled: true,
        },
        exitButton: {
            enabled: true,
        },
    },
};
DatePicker.props = {
    // --------------------------------------------------------------
    // Input props
    // --------------------------------------------------------------
    inputId: {type: String, optional: true},
    name: {type: String, optional: true},
    placeholder: {type: String, optional: true},
    readonly: {type: Boolean, optional: true},

    // --------------------------------------------------------------
    // Data & Data Validation
    // --------------------------------------------------------------
    // Input
    date: {type: [DateTime, {value: false}], optional: true},
    format: {type: String, optional: true},
    warn_future: {type: Boolean, optional: true},
    calendar: {type: Object, optional: true},
    calendarType: {type: String, optional: true},
    filetredDate: {type: Boolean, optional: true},

    // --------------------------------------------------------------
    // Events and handlers
    // --------------------------------------------------------------
    // If datetime changed, then, this function will be called and wait
    // for changes.
    onDateTimeChanged: {type: Function, optional: true},
    // Pass to the input field. Then parent component cant observer internal
    // input changes.
    onInput: {type: Function, optional: true},
    // On init, when all changes applyed, this will be called. Parent component
    // gets fist value. just call on setup.
    onUpdateInput: {type: Function, optional: true},
    revId: {type: Number, optional: true},

    // --------------------------------------------------------------
    // View options
    // --------------------------------------------------------------
    onlyTimePicker: {type: Boolean, optional: true},
    isInline: {type: Boolean, optional: true},
    timePicker: {type: Object, optional: true},
    dayPicker: {type: Object, optional: true},
    monthPicker: {type: Object, optional: true},
    yearPicker: {type: Object, optional: true},
    navigator: {type: Object, optional: true},
    toolbox: {type: Object, optional: true},
    altCalendarShowHint: {type: Boolean, optional: true},
    responsive: {type: Boolean, optional: true},
};

/**
 * Date/time picker
 *
 * Similar to the DatePicker component, adding the handling of more specific
 * time values: hour-minute-second.
 *
 * Once again, refer to the tempusdominus documentation for implementation
 * details.
 * @extends DatePicker
 */
export class DateTimePicker extends DatePicker {
    /**
     * @override
     */
    setup() {
        super.setup();
        // This.formatValue = wrapError(formatDateTime);
        // this.parseValue = wrapError(parseDateTime);
        // this.isLocal = true;
        this.isDateTime = true;
    }
}

DateTimePicker.defaultProps = {
    ...DatePicker.defaultProps,
};
DateTimePicker.defaultProps.timePicker.enabled = true;
