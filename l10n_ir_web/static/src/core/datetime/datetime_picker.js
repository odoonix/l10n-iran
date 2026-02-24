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

// Helpers
const numberRange = (min, max) =>
    [...Array(max - min)].map((_, i) => i + min);

const getStartOfDecade = (date) =>
    Math.floor(date.year / 10) * 10;
const getStartOfCentury = (date) =>
    Math.floor(date.year / 100) * 100;

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
        getTitle: (date, { additionalMonth }) => {
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
                const next = date.plus({ month: 1 });
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
                startDates.push(date.plus({ month: 1 }));
            }

            return startDates.map((date, i) => {
                // Calculate Jalali Month Range
                const currentJalaliDay = parseInt(
                    date.toLocaleString({
                        day: "numeric",
                        calendar: "persian",
                    }),
                    10
                );
                const startOfJalaliMonth = date.minus({
                    days: currentJalaliDay - 1,
                });

                let endOfJalaliMonth =
                    startOfJalaliMonth.plus({ days: 29 });
                while (
                    parseInt(
                        endOfJalaliMonth
                            .plus({ days: 1 })
                            .toLocaleString({
                                month: "numeric",
                                calendar: "persian",
                            }),
                        10
                    ) ===
                    parseInt(
                        startOfJalaliMonth.toLocaleString({
                            month: "numeric",
                            calendar: "persian",
                        }),
                        10
                    )
                ) {
                    endOfJalaliMonth = endOfJalaliMonth.plus({
                        days: 1,
                    });
                }
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
                                isValid:
                                    isInRange(range, [
                                        minDate,
                                        maxDate,
                                    ]) &&
                                    isDateValid?.(day),
                                label: "day",
                                range,
                                extraClass:
                                    dayCellClass?.(day) ||
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
                    number: monthRange[0].month,
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
        getItems: (date, { maxDate, minDate }) => {
            const currentJalaliMonth = parseInt(
                date.toLocaleString({
                    month: "numeric",
                    calendar: "persian",
                }),
                10
            );
            const startOfJalaliYear = date
                .minus({ months: currentJalaliMonth - 1 })
                .startOf("month");
            return numberRange(0, 12).map((i) => {
                const startOfMonth =
                    startOfJalaliYear.plus({ months: i });
                const range = [
                    startOfMonth,
                    startOfMonth.endOf("month"),
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
            const start = getStartOfDecade(date);
            return `${start - 1} - ${start + 10}`;
        },
        getItems: (date, { maxDate, minDate }) => {
            const startOfDecade = date
                .startOf("year")
                .set({ year: getStartOfDecade(date) });
            return numberRange(
                -GRID_MARGIN,
                GRID_COUNT + GRID_MARGIN
            ).map((i) => {
                const startOfYear = startOfDecade.plus({
                    year: i,
                });
                const range = [
                    startOfYear,
                    startOfYear.endOf("year"),
                ];
                return toDateItem({
                    isOutOfRange:
                        i < 0 || i >= GRID_COUNT,
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
            const start = getStartOfCentury(date);
            return `${start - 10} - ${start + 100}`;
        },
        getItems: (date, { maxDate, minDate }) => {
            const startOfCentury = date
                .startOf("year")
                .set({ year: getStartOfCentury(date) });
            return numberRange(
                -GRID_MARGIN,
                GRID_COUNT + GRID_MARGIN
            ).map((i) => {
                const startOfDecade = startOfCentury.plus({
                    year: i * 10,
                });
                const range = [
                    startOfDecade,
                    startOfDecade.plus({
                        year: 10,
                        millisecond: -1,
                    }),
                ];
                return toDateItem({
                    label: "year",
                    isOutOfRange:
                        i < 0 || i >= GRID_COUNT,
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
        if (localization.code !== "fa_IR") {
            return super.titles;
        }
        const { focusDate } = this.state;
        if (!focusDate) return [];
        const monthName = focusDate.toLocaleString({
            month: "long",
            calendar: "persian",
        });
        const year = focusDate.toLocaleString({
            year: "numeric",
            calendar: "persian",
        });
        return [`${monthName} ${year}`];
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

        if (
            !this.shouldAdjustFocusDate &&
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
            values[0].month !== values[1].month
        ) {
            dateToFocus = dateToFocus.minus({ month: 1 });
        }

        this.shouldAdjustFocusDate = false;

        // Jalali Logic: Focus on the start of the
        // Jalali month to prevent UI jumps
        const currentJalaliDay = parseInt(
            dateToFocus.toLocaleString({
                day: "numeric",
                calendar: "persian",
            }),
            10
        );
        const startOfJalaliMonth = dateToFocus.minus({
            days: currentJalaliDay - 1,
        });
        
        this.state.focusDate = this.clamp(
            startOfJalaliMonth
        );
    },
});