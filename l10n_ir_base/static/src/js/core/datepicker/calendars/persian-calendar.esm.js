/** @odoo-module **/

import {Calendar} from "./calendar";

export class PersianCalendar extends Calendar {
    /**
     * @see Calendar#name
     */
    get name() {
        return "persian";
    }
}
