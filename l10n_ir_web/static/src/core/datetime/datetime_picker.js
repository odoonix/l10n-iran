/** @odoo-module **/
import { DateTimePicker } from "@web/core/datetime/datetime_picker";
import { patch } from "@web/core/utils/patch";
import { localization } from "@web/core/l10n/localization";
import { _t } from "@web/core/l10n/translation";
import { isInRange, today } from "@web/core/l10n/dates";

const { Info } = luxon;

// Constants
const GRID_COUNT = 10;
const GRID_MARGIN = 1;
const DAYS_PER_WEEK = 7;
const WEEKS_PER_MONTH = 6;
const JALALI_NUMERIC_LOCALE = "en-u-ca-persian-nu-latn";
const JALALI_PARTS_FORMATTER = new Intl.DateTimeFormat(
    JALALI_NUMERIC_LOCALE, {
        calendar: "persian",
        numberingSystem: "latn",
        year: "numeric",
        month: "numeric",
        day: "numeric",
    }
);

// Helpers
const numberRange = (min, max) => [...Array(max - min)].map((_, i) => i + min);

const getJalaliParts = (date) => {
    const parts = {};
    for (const part of JALALI_PARTS_FORMATTER.formatToParts(date.toJSDate())) {
        if (part.type === "year" || part.type === "month" || part.type === "day") {
            parts[part.type] = Number(part.value);
        }
    }
    return parts;
};

const getJalaliYear = (date) => getJalaliParts(date).year;
const getJalaliMonth = (date) => getJalaliParts(date).month;
const getJalaliDay = (date) => getJalaliParts(date).day;
const isSameJalaliMonth = (left, right) =>
    getJalaliYear(left) === getJalaliYear(right) &&
    getJalaliMonth(left) === getJalaliMonth(right);

const getStartOfJalaliMonth = (date) =>
    date.startOf("day").minus({ days: getJalaliDay(date) - 1 });

const getEndOfJalaliMonth = (date) => {
    const startOfJalaliMonth = getStartOfJalaliMonth(date);
    let endOfJalaliMonth = startOfJalaliMonth.plus({ days: 29 });
    while (isSameJalaliMonth(endOfJalaliMonth.plus({ days: 1 }), startOfJalaliMonth)) {
        endOfJalaliMonth = endOfJalaliMonth.plus({ days: 1 });
    }
    return endOfJalaliMonth;
};

const getStartOfNextJalaliMonth = (date) =>
    getEndOfJalaliMonth(date).plus({ days: 1 }).startOf("day");

const getStartOfPreviousJalaliMonth = (date) =>
    getStartOfJalaliMonth(date).minus({ days: 1 }).startOf("day");

const addJalaliMonths = (date, count) => {
    let cursor = getStartOfJalaliMonth(date);
    const stepCount = Math.abs(count);
    for (let i = 0; i < stepCount; i++) {
        cursor =
            count >= 0 ?
            getStartOfNextJalaliMonth(cursor) :
            getStartOfJalaliMonth(getStartOfPreviousJalaliMonth(cursor));
    }
    return cursor;
};

const getStartOfJalaliYear = (date) => addJalaliMonths(date, -(getJalaliMonth(date) - 1));
const addJalaliYears = (date, count) => addJalaliMonths(getStartOfJalaliYear(date), count * 12);

const getStartOfJalaliDecade = (date) =>
    addJalaliYears(date, -(getJalaliYear(date) % 10));

const getStartOfJalaliCentury = (date) =>
    addJalaliYears(date, -(getJalaliYear(date) % 100));

const shiftJalaliFocusDate = (date, precision, direction) => {
    switch (precision) {
        case "days":
            return addJalaliMonths(date, direction);
        case "months":
            return addJalaliYears(date, direction);
        case "years":
            return addJalaliYears(date, direction * 10);
        case "decades":
            return addJalaliYears(date, direction * 100);
        default:
            return date;
    }
};

const getJalaliValue = (date, type) => {
    if (type === "year") {
        return date.toLocaleString({
            year: "numeric",
            calendar: "persian",
        });
    }
    if (type === "month" || type === "monthLong") {
        return date.toLocaleString({
            month: "long",
            calendar: "persian",
        });
    }
    if (type === "monthShort") {
        return date.toLocaleString({
            month: "short",
            calendar: "persian",
        });
    }
    return date.toLocaleString({
        [type]: "numeric",
        calendar: "persian",
    });
};

const toDateItem = ({
    isOutOfRange = false,
    isValid = true,
    label,
    range,
    extraClass,
}) => ({
    id: range[0].toISODate(),
    includesToday: isInRange(luxon.DateTime.now(), range),
    isOutOfRange,
    isValid,
    label: String(getJalaliValue(range[0], label)),
    range,
    extraClass,
});

const toWeekItem = (weekDayItems) => ({
    number: weekDayItems[3].range[0].weekNumber,
    days: weekDayItems,
});

/**
 * Jalali Precision Levels Map
 * @type {Map<PrecisionLevel, PrecisionInfo>}
 */
const JALALI_PRECISION_MAP = new Map()
    .set("days", {
        mainTitle: _t("Select month"),
        nextTitle: _t("Next month"),
        prevTitle: _t("Previous month"),
        step: { month: 1 },
        // FIX: Added default values for parameters to prevent destructuring errors
        getTitle: (date, { additionalMonth } = {}) => {
            const titles = [
                `${date.toLocaleString({
                    month: "long",
                    calendar: "persian",
                })} ${date.toLocaleString({
                    year: "numeric",
                    calendar: "persian",
                })}`,
            ];
            if (additionalMonth) {
                const next = addJalaliMonths(date, 1);
                titles.push(
                    `${next.toLocaleString({
                        month: "long",
                        calendar: "persian",
                    })} ${next.toLocaleString({
                        year: "numeric",
                        calendar: "persian",
                    })}`
                );
            }
            return titles;
        },
        getItems: (
            date, {
                additionalMonth = false,
                maxDate,
                minDate,
                showWeekNumbers,
                isDateValid,
                dayCellClass,
            } = {}
        ) => {
            const startDates = [date];
            if (additionalMonth) {
                startDates.push(addJalaliMonths(date, 1));
            }
            return startDates.map((date, i) => {
                const startOfJalaliMonth = getStartOfJalaliMonth(date);
                const endOfJalaliMonth = getEndOfJalaliMonth(date);
                const monthRange = [
                    startOfJalaliMonth,
                    endOfJalaliMonth,
                ];
                // Calculate Grid Start Date (Saturday)
                const luxonWeekday = startOfJalaliMonth.weekday;
                const persianWeekdayIndex =
                    (luxonWeekday + 1) % 7 + 1;
                const daysToSubtract = persianWeekdayIndex - 1;
                let gridStartDate = startOfJalaliMonth.minus({
                    days: daysToSubtract,
                });
                // Generate Weeks
                const weeks = [];
                for (let w = 0; w < WEEKS_PER_MONTH; w++) {
                    const weekDayItems = [];
                    for (let d = 0; d < DAYS_PER_WEEK; d++) {
                        const day = gridStartDate.plus({
                            days: d,
                        });
                        const range = [day, day.endOf("day")];
                        weekDayItems.push(
                            toDateItem({
                                isOutOfRange: !isInRange(
                                    day,
                                    monthRange
                                ),
                                isValid: isInRange(range, [
                                        minDate,
                                        maxDate,
                                    ]) &&
                                    isDateValid ? .(day),
                                label: "day",
                                range,
                                extraClass: dayCellClass ? .(day) ||
                                    "",
                            })
                        );
                    }
                    gridStartDate = gridStartDate.plus({
                        days: DAYS_PER_WEEK,
                    });
                    weeks.push(toWeekItem(weekDayItems));
                }
                // Generate Days of Week Labels
                const daysOfWeek = weeks[0].days.map((d) => [
                    d.range[0].weekdayShort,
                    d.range[0].weekdayLong,
                    Info.weekdays("narrow", {
                        locale: d.range[0].locale,
                    })[d.range[0].weekday - 1],
                ]);
                if (showWeekNumbers) {
                    daysOfWeek.unshift([
                        "#",
                        _t("Week numbers"),
                        "#",
                    ]);
                }
                return {
                    id: `month__${i}`,
                    number: getJalaliMonth(monthRange[0]),
                    daysOfWeek,
                    weeks,
                };
            });
        },
    })
    .set("months", {
        mainTitle: _t("Select year"),
        nextTitle: _t("Next year"),
        prevTitle: _t("Previous year"),
        step: { year: 1 },
        getTitle: (date) =>
            String(
                date.toLocaleString({
                    year: "numeric",
                    calendar: "persian",
                })
            ),
        getItems: (date, { maxDate, minDate } = {}) => {
            const startOfJalaliYear = getStartOfJalaliYear(date);
            return numberRange(0, 12).map((i) => {
                const startOfMonth = addJalaliMonths(
                    startOfJalaliYear,
                    i
                );
                const range = [
                    startOfMonth,
                    getStartOfNextJalaliMonth(startOfMonth).minus({
                        millisecond: 1,
                    }),
                ];
                return toDateItem({
                    isValid: isInRange(range, [
                        minDate,
                        maxDate,
                    ]),
                    label: "monthShort",
                    range,
                });
            });
        },
    })
    .set("years", {
        mainTitle: _t("Select decade"),
        nextTitle: _t("Next decade"),
        prevTitle: _t("Previous decade"),
        step: { year: 10 },
        getTitle: (date) => {
            const start = getJalaliYear(getStartOfJalaliDecade(date));
            return `${start - 1} - ${start + 10}`;
        },
        getItems: (date, { maxDate, minDate } = {}) => {
            const startOfDecade = getStartOfJalaliDecade(date);
            return numberRange(-GRID_MARGIN,
                GRID_COUNT + GRID_MARGIN
            ).map((i) => {
                const startOfYear = addJalaliYears(
                    startOfDecade,
                    i
                );
                const range = [
                    startOfYear,
                    addJalaliYears(startOfYear, 1).minus({
                        millisecond: 1,
                    }),
                ];
                return toDateItem({
                    isOutOfRange: i < 0 || i >= GRID_COUNT,
                    isValid: isInRange(range, [
                        minDate,
                        maxDate,
                    ]),
                    label: "year",
                    range,
                });
            });
        },
    })
    .set("decades", {
        mainTitle: _t("Select century"),
        nextTitle: _t("Next century"),
        prevTitle: _t("Previous century"),
        step: { year: 100 },
        getTitle: (date) => {
            const start = getJalaliYear(getStartOfJalaliCentury(date));
            return `${start - 10} - ${start + 100}`;
        },
        getItems: (date, { maxDate, minDate } = {}) => {
            const startOfCentury = getStartOfJalaliCentury(date);
            return numberRange(-GRID_MARGIN,
                GRID_COUNT + GRID_MARGIN
            ).map((i) => {
                const startOfDecade = addJalaliYears(
                    startOfCentury,
                    i * 10
                );
                const range = [
                    startOfDecade,
                    addJalaliYears(startOfDecade, 10).minus({
                        millisecond: 1,
                    }),
                ];
                return toDateItem({
                    label: "year",
                    isOutOfRange: i < 0 || i >= GRID_COUNT,
                    isValid: isInRange(range, [
                        minDate,
                        maxDate,
                    ]),
                    range,
                });
            });
        },
    });

patch(DateTimePicker.prototype, {
    setup() {
        super.setup();
    },
    get titles() {
        return super.titles;
    },
    get activePrecisionLevel() {
        if (localization.code !== "fa_IR") {
            return super.activePrecisionLevel;
        }
        return JALALI_PRECISION_MAP.get(
            this.state.precision
        );
    },
    /**
     * Override adjustFocus to prevent jumping to
     * previous month when selecting 1st of Jalali month.
     */
    adjustFocus(values, focusedDateIndex) {
        if (localization.code !== "fa_IR") {
            return super.adjustFocus(values, focusedDateIndex);
        }
        if (!this.shouldAdjustFocusDate &&
            this.state.focusDate
        ) {
            return;
        }
        let dateToFocus =
            values[focusedDateIndex] ||
            values[focusedDateIndex === 1 ? 0 : 1] ||
            today();
        if (
            this.additionalMonth &&
            focusedDateIndex === 1 &&
            values[0] &&
            values[1] &&
            !isSameJalaliMonth(values[0], values[1])
        ) {
            dateToFocus = addJalaliMonths(dateToFocus, -1);
        }
        this.shouldAdjustFocusDate = false;
        this.state.focusDate = this.clamp(
            getStartOfJalaliMonth(dateToFocus)
        );
    },
    next(ev) {
        if (localization.code !== "fa_IR") {
            return super.next(ev);
        }
        ev.preventDefault();
        this.state.focusDate = this.clamp(
            shiftJalaliFocusDate(
                this.state.focusDate,
                this.state.precision,
                1
            )
        );
    },
    previous(ev) {
        if (localization.code !== "fa_IR") {
            return super.previous(ev);
        }
        ev.preventDefault();
        this.state.focusDate = this.clamp(
            shiftJalaliFocusDate(
                this.state.focusDate,
                this.state.precision, -1
            )
        );
    },
});