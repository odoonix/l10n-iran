/** @odoo-module **/

import {Component, onWillStart, useEffect, useExternalListener, useRef} from "@odoo/owl";
import {luxonToMoment, momentToLuxon} from "@web/core/l10n/dates";
import {loadJS} from "@web/core/assets";
import {registry} from "@web/core/registry";
import {standardFieldProps} from "@web/views/fields/standard_field_props";
import {useService} from "@web/core/utils/hooks";

const formatters = registry.category("formatters");
const parsers = registry.category("parsers");

export class VwDateRangeField extends Component {
    setup() {
        this.notification = useService("notification");
        this.root = useRef("root");
        this.isPickerShown = false;
        // This.pickerContainer;

        useExternalListener(window, "scroll", this.onWindowScroll, {
            capture: true,
        });
        onWillStart(() => loadJS("/web/static/lib/daterangepicker/daterangepicker.js"));
        useEffect(
            (el) => {
                if (el) {
                    window.$(el).daterangepicker({
                        timePicker: this.isDateTime,
                        timePicker24Hour: true,
                        timePickerIncrement: 5,
                        autoUpdateInput: false,
                        locale: {
                            applyLabel: this.env._t("Apply"),
                            cancelLabel: this.env._t("Cancel"),
                        },
                        startDate: this.startDate ? luxonToMoment(this.startDate) : window.moment(),
                        endDate: this.endDate ? luxonToMoment(this.endDate) : window.moment(),
                        drops: "auto",
                    });
                    this.pickerContainer = window.$(el).data("daterangepicker").container[0];

                    window.$(el).on("apply.daterangepicker", this.onPickerApply.bind(this));
                    window.$(el).on("show.daterangepicker", this.onPickerShow.bind(this));
                    window.$(el).on("hide.daterangepicker", this.onPickerHide.bind(this));

                    this.pickerContainer.dataset.name = this.props.name;
                }

                return () => {
                    if (el) {
                        this.pickerContainer.remove();
                    }
                };
            },
            () => [this.root.el]
        );
    }

    get isDateTime() {
        return this.props.formatType === "datetime";
    }
    get formattedValue() {
        return this.formatValue(this.props.formatType, this.props.value);
    }
    get formattedEndDate() {
        return this.formatValue(this.props.formatType, this.endDate);
    }
    get formattedStartDate() {
        return this.formatValue(this.props.formatType, this.startDate);
    }
    get startDate() {
        return this.props.record.data[this.props.relatedStartDateField || this.props.name];
    }
    get endDate() {
        return this.props.record.data[this.props.relatedEndDateField || this.props.name];
    }
    get relatedDateRangeField() {
        return this.props.relatedStartDateField ? this.props.relatedStartDateField : this.props.relatedEndDateField;
    }

    formatValue(format, value) {
        const formatter = formatters.get(format);
        let formattedValue = null;
        try {
            formattedValue = formatter(value);
        } catch {
            this.props.record.setInvalidField(this.props.name);
        }
        return formattedValue;
    }

    updateRange(start, end) {
        return this.props.record.update({
            [this.props.relatedStartDateField || this.props.name]: start,
            [this.props.relatedEndDateField || this.props.name]: end,
        });
    }

    onChangeInput(ev) {
        try {
            const parse = parsers.get(this.props.formatType);
            this.props.update(parse(ev.target.value));
        } catch {
            this.props.record.setInvalidField(this.props.name);
        }
    }

    onWindowScroll(ev) {
        const target = ev.target;
        if (this.isPickerShown && !this.env.isSmall && (target === window || !this.pickerContainer.contains(target))) {
            window.$(this.root.el).data("daterangepicker").hide();
        }
    }

    async onPickerApply(ev, picker) {
        const start = this.isDateTime ? picker.startDate : picker.startDate.startOf("day");
        const end = this.isDateTime ? picker.endDate : picker.endDate.startOf("day");
        const dates = [start, end].map(momentToLuxon);
        await this.updateRange(dates[0], dates[1]);
        const input = document.querySelector(`.o_field_daterange[name='${this.relatedDateRangeField}'] input`);
        const target = window.$(input).data("daterangepicker");
        target.setStartDate(picker.startDate);
        target.setEndDate(picker.endDate);
    }
    onPickerShow() {
        this.isPickerShown = true;
    }
    onPickerHide() {
        this.isPickerShown = false;
    }
}
VwDateRangeField.template = "l10n_ir_web.DateRangeField";
VwDateRangeField.props = {
    ...standardFieldProps,
    relatedEndDateField: {type: String, optional: true},
    relatedStartDateField: {type: String, optional: true},
    formatType: {type: String, optional: true},
    placeholder: {type: String, optional: true},
};

VwDateRangeField.supportedTypes = ["date", "datetime"];

VwDateRangeField.extractProps = ({attrs, field}) => {
    return {
        relatedEndDateField: attrs.options.related_end_date,
        relatedStartDateField: attrs.options.related_start_date,
        formatType: attrs.options.format_type || field.type,
        placeholder: attrs.placeholder,
    };
};

registry.category("fields").add("daterange", VwDateRangeField, {force: true});
