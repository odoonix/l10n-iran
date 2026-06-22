/** @odoo-module **/

import {DateTimeField} from "@web/views/fields/datetime/datetime_field";
import {DateTimePicker} from "../../core/datepicker/datepicker.esm";
import {registry} from "@web/core/registry";

export class ExDateTimeField extends DateTimeField {}

ExDateTimeField.components = {
    DateTimePicker,
};

registry.category("fields").add("datetime", ExDateTimeField, {force: true});
