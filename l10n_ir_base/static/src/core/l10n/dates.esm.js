/** @odoo-module **/

import * as dates from "@web/core/l10n/dates";
import {_t} from "@web/core/l10n/translation";
import {sprintf} from "@web/core/utils/strings";
import {localization} from "@web/core/l10n/localization";

const {DateTime, Settings} = luxon;

const SERVER_DATE_FORMAT = "yyyy-MM-dd";
const SERVER_TIME_FORMAT = "HH:mm:ss";
const SERVER_DATETIME_FORMAT = `${SERVER_DATE_FORMAT} ${SERVER_TIME_FORMAT}`;

const nonAlphaRegex = /[^a-zA-Z]/g;
const nonDigitsRegex = /\D/g;

dates.formatDate = function (value, options = {}) {
    if (value === false) {
        return "";
    }
    const format = options.format || localization.dateFormat;
    const numberingSystem = options.numberingSystem || Settings.defaultNumberingSystem || "latn";
    const outputCalendar = options.outputCalendar || Settings.defaultOutputCalendar || "iso8601";
    return value.toFormat(format, {numberingSystem, outputCalendar});
};

dates.formatDateTime = function (value, options = {}) {
    if (value === false) {
        return "";
    }
    const format = options.format || localization.dateTimeFormat;
    const numberingSystem = options.numberingSystem || Settings.defaultNumberingSystem || "latn";
    const outputCalendar = options.outputCalendar || Settings.defaultOutputCalendar || "iso8601";
    return value.setZone("default").toFormat(format, {numberingSystem, outputCalendar});
};

dates.parseDateTime = function (value, options = {}) {
    if (!value) {
        return false;
    }

    const fmt = options.format || localization.dateTimeFormat;
    const parseOpts = {
        setZone: true,
        zone: "default",
        locale: options.locale,
        numberingSystem: options.numberingSystem || Settings.defaultNumberingSystem || "latn",
    };

    // Base case: try parsing with the given format and options
    let result = DateTime.fromFormat(value, fmt, parseOpts);

    // Try parsing as a smart date
    if (!dates.isValidDateTime(result)) {
        result = dates.parseSmartDateInput(value);
    }

    // Try parsing with partial date parts
    if (!dates.isValidDateTime(result)) {
        const fmtWoZero = dates.stripAlphaDupes(fmt);
        result = DateTime.fromFormat(value, fmtWoZero, parseOpts);
    }

    // Try parsing with custom shorthand date parts
    if (!dates.isValidDateTime(result)) {
        // Luxon is not permissive regarding delimiting characters in the format.
        // So if the value to parse has less characters than the format, we would
        // try to parse without the delimiting characters.
        const digitList = value.split(nonDigitsRegex).filter(Boolean);
        const fmtList = fmt.split(nonAlphaRegex).filter(Boolean);
        const valWoSeps = digitList.join("");

        // This is the weird part: we try to adapt the given format to comply with
        // the amount of digits in the given value. To do this we split the format
        // and the value on non-letter and non-digit characters respectively. This
        // should create the same amount of grouping parameters, and the format
        // groups are trimmed according to the length of their corresponding
        // digit group. The 'carry' variable allows for the length of a digit
        // group to overflow to the next format group. This is typically the case
        // when the given value doesn't have non-digit separators and generates
        // one big digit group instead.
        let carry = 0;
        const fmtWoSeps = fmtList
            .map((part, i) => {
                const digitLength = (digitList[i] || "").length;
                const actualPart = part.slice(0, digitLength + carry);
                carry += digitLength - actualPart.length;
                return actualPart;
            })
            .join("");

        result = DateTime.fromFormat(valWoSeps, fmtWoSeps, parseOpts);
    }

    // Try with defaul ISO or SQL formats
    if (!dates.isValidDateTime(result)) {
        // Also try some fallback formats, but only if value counts more than
        // four digit characters as this could get misinterpreted as the time of
        // the actual date.
        const valueDigits = value.replace(nonDigitsRegex, "");
        if (valueDigits.length > 4) {
            result = DateTime.fromISO(value, parseOpts);
            if (!dates.isValidDateTime(result)) {
                result = DateTime.fromSQL(value, parseOpts);
            }
        }
    }

    // No working parsing methods: throw an error
    if (!dates.isValidDateTime(result)) {
        throw new Error(sprintf(_t("'%s' is not a correct date or datetime"), value));
    }

    return result.setZone("default");
};

dates.deserializeDate = function (value) {
    return DateTime.fromSQL(value, {
        zone: "default",
        numberingSystem: "latn",
        outputCalendar: "iso8601",
    });
};

dates.deserializeDateTime = function (value) {
    return DateTime.fromSQL(value, {
        zone: "utc",
        numberingSystem: "latn",
        outputCalendar: "iso8601",
    }).setZone("default");
};

const dateCache = new WeakMap();

dates.serializeDate = function (value) {
    if (!dateCache.has(value)) {
        dateCache.set(
            value,
            value.toFormat(SERVER_DATE_FORMAT, {
                numberingSystem: "latn",
                outputCalendar: "iso8601",
            })
        );
    }
    return dateCache.get(value);
};

const dateTimeCache = new WeakMap();

dates.serializeDateTime = function (value) {
    if (!dateTimeCache.has(value)) {
        dateTimeCache.set(
            value,
            value.setZone("utc").toFormat(SERVER_DATETIME_FORMAT, {
                numberingSystem: "latn",
                outputCalendar: "iso8601",
            })
        );
    }
    return dateTimeCache.get(value);
};
