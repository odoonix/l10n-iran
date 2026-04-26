/** @odoo-module **/

import {DateTimePicker} from "@web/core/datetime/datetime_picker";
import {patch} from "@web/core/utils/patch";
import {localization} from "@web/core/l10n/localization";
import {_t} from "@web/core/l10n/translation";
import {isInRange, today} from "@web/core/l10n/dates";

const {Info} = luxon;

const GRID_COUNT = 10;
const GRID_MARGIN = 1;
const DAYS_PER_WEEK = 7;
const WEEKS_PER_MONTH = 6;

const numberRange = (min, max) =>
    [...Array(max - min)].map((_, i) => i + min);

const getStartOfDecade = (date) => Math.floor(date.year / 10) * 10;
const getStartOfCentury = (date) => Math.floor(date.year / 100) * 100;

/**
 * Persian month identity key (prevents duplicates & boundary bugs)
 */
const getPersianMonthKey = (date) =>
    date.toLocaleString({
        year: "numeric",
        month: "numeric",
        calendar: "persian",
    });

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

const JALALI_PRECISION_MAP = new Map()
    .set("days", {
        mainTitle: _t("Select month"),
        nextTitle: _t("Next month"),
        prevTitle: _t("Previous month"),
        step: {month: 1},

        /**
         * 🔥 FIX: full Persian header (no Gregorian fallback)
         */
        getTitle: (date, {additionalMonth}) => {
            const format = {
                year: "numeric",
                month: "long",
                calendar: "persian",
            };

            const titles = [date.toLocaleString(format)];

            if (additionalMonth) {
                const next = date.plus({month: 1});

                // prevent duplicate month header
                if (getPersianMonthKey(next) !== getPersianMonthKey(date)) {
                    titles.push(next.toLocaleString(format));
                }
            }

            return titles;
        },

        getItems: (
            date,
            {
                additionalMonth,
                maxDate,
                minDate,
                showWeekNumbers,
                isDateValid,
                dayCellClass,
            }
        ) => {
            const startDates = [date];

            if (additionalMonth) {
                const next = date.plus({month: 1});

                if (getPersianMonthKey(next) !== getPersianMonthKey(date)) {
                    startDates.push(next);
                }
            }

            return startDates.map((startDate, i) => {
                const monthKey = getPersianMonthKey(startDate);

                // find real start of Persian month
                let cursor = startDate;
                while (
                    getPersianMonthKey(cursor.minus({days: 1})) === monthKey
                ) {
                    cursor = cursor.minus({days: 1});
                }

                const startOfMonth = cursor;

                // find real end of Persian month
                let endCursor = startOfMonth;
                while (
                    getPersianMonthKey(endCursor.plus({days: 1})) === monthKey
                ) {
                    endCursor = endCursor.plus({days: 1});
                }

                const monthRange = [startOfMonth, endCursor];

                const luxonWeekday = startOfMonth.weekday;
                const persianWeekdayIndex = ((luxonWeekday + 1) % 7) + 1;

                const gridStartDate = startOfMonth.minus({
                    days: persianWeekdayIndex - 1,
                });

                const weeks = [];
                let cursorDay = gridStartDate;

                while (weeks.length < WEEKS_PER_MONTH) {
                    const weekDayItems = [];

                    for (let d = 0; d < DAYS_PER_WEEK; d++) {
                        const day = cursorDay.plus({days: d});
                        const range = [day, day.endOf("day")];

                        weekDayItems.push(
                            toDateItem({
                                isOutOfRange: !isInRange(day, monthRange),
                                isValid:
                                    isInRange(range, [minDate, maxDate]) &&
                                    isDateValid?.(day),
                                label: "day",
                                range,
                                extraClass: dayCellClass?.(day) || "",
                            })
                        );
                    }

                    weeks.push(toWeekItem(weekDayItems));
                    cursorDay = cursorDay.plus({days: DAYS_PER_WEEK});

                    if (cursorDay > endCursor && weeks.length >= 4) {
                        break;
                    }
                }

                const daysOfWeek = weeks[0].days.map((d) => [
                    d.range[0].weekdayShort,
                    d.range[0].weekdayLong,
                    Info.weekdays("narrow", {
                        locale: d.range[0].locale,
                    })[d.range[0].weekday - 1],
                ]);

                if (showWeekNumbers) {
                    daysOfWeek.unshift(["#", _t("Week numbers"), "#"]);
                }

                return {
                    id: `month__${i}`,
                    number: startOfMonth.month,
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
        step: {year: 1},

        /**
         * 🔥 FIX: Jalali year header (no Gregorian fallback possible)
         */
        getTitle: (date) =>
            date.toLocaleString({
                year: "numeric",
                calendar: "persian",
            }),

        getItems: (date, {maxDate, minDate}) => {
            const currentMonth = parseInt(
                date.toLocaleString({
                    month: "numeric",
                    calendar: "persian",
                }),
                10
            );

            const startOfYear = date
                .minus({months: currentMonth - 1})
                .startOf("month");

            return numberRange(0, 12).map((i) => {
                const startOfMonth = startOfYear.plus({months: i});
                const range = [
                    startOfMonth,
                    startOfMonth.endOf("month"),
                ];

                return toDateItem({
                    isValid: isInRange(range, [minDate, maxDate]),
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
        step: {year: 10},

        getTitle: (date) => {
            const start = getStartOfDecade(date);
            return `${start - 1} - ${start + 10}`;
        },

        getItems: (date, {maxDate, minDate}) => {
            const start = date
                .startOf("year")
                .set({year: getStartOfDecade(date)});

            return numberRange(-GRID_MARGIN, GRID_COUNT + GRID_MARGIN).map(
                (i) => {
                    const year = start.plus({year: i});
                    const range = [year, year.endOf("year")];

                    return toDateItem({
                        isOutOfRange: i < 0 || i >= GRID_COUNT,
                        isValid: isInRange(range, [minDate, maxDate]),
                        label: "year",
                        range,
                    });
                }
            );
        },
    })
    .set("decades", {
        mainTitle: _t("Select century"),
        nextTitle: _t("Next century"),
        prevTitle: _t("Previous century"),
        step: {year: 100},

        getTitle: (date) => {
            const start = getStartOfCentury(date);
            return `${start - 10} - ${start + 100}`;
        },

        getItems: (date, {maxDate, minDate}) => {
            const start = date
                .startOf("year")
                .set({year: getStartOfCentury(date)});

            return numberRange(-GRID_MARGIN, GRID_COUNT + GRID_MARGIN).map(
                (i) => {
                    const decade = start.plus({year: i * 10});
                    const range = [
                        decade,
                        decade.plus({year: 10, millisecond: -1}),
                    ];

                    return toDateItem({
                        label: "year",
                        isOutOfRange: i < 0 || i >= GRID_COUNT,
                        isValid: isInRange(range, [minDate, maxDate]),
                        range,
                    });
                }
            );
        },
    });

patch(DateTimePicker.prototype, {
    get titles() {
        if (localization.code !== "fa_IR") {
            return super.titles;
        }

        const {focusDate} = this.state;
        if (!focusDate) return [];

        return [
            focusDate.toLocaleString({
                month: "long",
                year: "numeric",
                calendar: "persian",
            }),
        ];
    },

    get activePrecisionLevel() {
        if (localization.code !== "fa_IR") {
            return super.activePrecisionLevel;
        }
        return JALALI_PRECISION_MAP.get(this.state.precision);
    },
});