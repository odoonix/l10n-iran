/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { localization } from "@web/core/l10n/localization";
import { registry } from "@web/core/registry";
import { DateTimeField } from "@web/views/fields/datetime/datetime_field";

// List and kanban view
const formatters = registry.category("formatters");

// Get original Odoo formatters to use for English language
const originalDateFormatter = formatters.get("date");
const originalDateTimeFormatter = formatters.get("datetime");

function formatJalaliDate(dt) {
    if (!dt) return "";
    return dt.toLocaleString({
        calendar: "persian",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

function formatJalaliDateTime(dt) {
    if (!dt) return "";
    return dt.toLocaleString({
        calendar: "persian",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// Add new formatter with force: true
// But this time, if the language is English, we call the original function so it doesn't return null
formatters.add("date", (value, options) => {
    if (localization.code === "fa_IR") {
        return formatJalaliDate(value);
    }
    // Execute original formatter for other languages
    return originalDateFormatter(value, options);
}, { force: true });

formatters.add("datetime", (value, options) => {
    if (localization.code === "fa_IR") {
        return formatJalaliDateTime(value);
    }
    // Execute original formatter for other languages
    return originalDateTimeFormatter(value, options);
}, { force: true });

// Read only field
patch(DateTimeField.prototype, {
    getFormattedValue(valueIndex) {
        const value = this.values[valueIndex];
        if (!value) return "";

        // If language is not Persian, return the result of the original method (super)
        if (localization.code !== "fa_IR") {
            return super.getFormattedValue(valueIndex);
        }

        const { condensed, showSeconds, showTime } = this.props;

        // Only for Persian language
        const options = {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            calendar: "persian",
        };
        // Add time only if field type is datetime
        if (this.field.type !== "date") {
            options.hour = showTime ? "2-digit" : undefined;
            options.minute = showTime ? "2-digit" : undefined;
            options.second = showSeconds ? "2-digit" : undefined;
        }
        return value.toLocaleString(options);
    },
});