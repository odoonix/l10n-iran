/** @odoo-module **/
export class TypeChecking {
    /**
     * @param {*} input
     * @returns {Boolean}
     */
    static isArray(input) {
        return Object.prototype.toString.call(input) === "[object Array]";
    }

    /**
     *
     * @param {*} input
     * @returns {Boolean}
     */
    static isNumber(input) {
        return typeof input === "number";
    }

    /**
     *
     * @param {*} input
     * @returns {Boolean}
     */
    static isDate(input) {
        return input instanceof Date;
    }
}
