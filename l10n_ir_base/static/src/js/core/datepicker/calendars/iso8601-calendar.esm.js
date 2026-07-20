/** @odoo-module **/

import {Calendar} from "./calendar";

export class Iso8601Calendar extends Calendar {
    /**
     * @see Calendar#name
     */
    get name() {
        return "iso8601";
    }
}
