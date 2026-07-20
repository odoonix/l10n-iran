/** @odoo-module **/
import {DatePicker, DateTimePicker} from "../../core/datepicker/datepicker.esm";
import {formatDate, formatDateTime} from "@web/core/I10n/dates";

import {Component} from "@odoo/owl";
import {_lt} from "@web/core/l10n/translation";
import {localization} from "@web/core/l10n/localization";
import {registry} from "@web/core/registry";
import {standardFieldProps} from "@web/views/fields/standard_field_props";

export class RemainingDaysField extends Component {
    get hasTime() {
        return this.props.type === "datetime";
    }

    get pickerComponent() {
        return this.hasTime ? DateTimePicker : DatePicker;
    }

    get diffDays() {
        if (!this.props.value) {
            return null;
        }
        const today = luxon.DateTime.local().startOf("day");
        return Math.floor(this.props.value.startOf("day").diff(today, "days").days);
    }

    get formattedValue() {
        return this.hasTime
            ? formatDateTime(this.props.value, {
                  format: localization.dateFormat,
                  locale: "fa_IR",
                  numberingSystem: "persian",
                  outputCalendar: "persian",
              })
            : formatDate(this.props.value, {
                  locale: "fa_IR",
                  numberingSystem: "persian",
                  outputCalendar: "persian",
              });
    }

    onDateTimeChanged(datetime) {
        if (datetime) {
            this.props.update(datetime);
        } else if (typeof datetime === "string") {
            // When the date is cleared
            this.props.update(false);
        }
    }
}

RemainingDaysField.template = "l10n_ir_web.RemainingDaysField";
RemainingDaysField.props = {
    ...standardFieldProps,
};

RemainingDaysField.displayName = _lt("Remaining Days");
RemainingDaysField.supportedTypes = ["date", "datetime"];

registry.category("fields").add("remaining_days", RemainingDaysField, {force: true});
