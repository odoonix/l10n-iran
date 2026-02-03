/** @odoo-module **/

// //odoo/addons/web/static/src/search/filter_menu/custom_filter_item.js
import {Dropdown} from "@web/core/dropdown/dropdown";
import {CustomFilterItem} from "@web/search/filter_menu/custom_filter_item";

import {DatePicker, DateTimePicker} from "./core/datepicker/datepicker.esm";

CustomFilterItem.components = {DatePicker, DateTimePicker, Dropdown};
