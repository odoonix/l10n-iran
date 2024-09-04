/** @odoo-module **/

import {DateField} from "@web/views/fields/date/date_field";
import {DatePicker} from "../../core/datepicker/datepicker.esm";
import {registry} from "@web/core/registry";

/**
 * Manages date field in forms and treas
 *
 * It use Persian Datepicker to select and edit Date.
 */
export class ExDateField extends DateField {}

ExDateField.components = {
    DatePicker,
};

registry.category("fields").add("date", ExDateField, {force: true});
