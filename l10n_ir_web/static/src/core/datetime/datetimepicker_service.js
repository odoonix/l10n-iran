/** @odoo-module **/
import { datetimePickerService } from "@web/core/datetime/datetimepicker_service";
import { DateTimePicker } from "@web/core/datetime/datetime_picker";
import { DateTimePickerPopover } from "@web/core/datetime/datetime_picker_popover";
import { patch } from "@web/core/utils/patch";
import { localization } from "@web/core/l10n/localization";
import { areDatesEqual, formatDate, formatDateTime, parseDate, parseDateTime } from "@web/core/l10n/dates";
import { makePopover } from "@web/core/popover/popover_hook";
import { ensureArray, zip, zipWith } from "@web/core/utils/arrays";
import { markRaw, reactive, useRef, onWillRender, useEffect, onPatched } from "@odoo/owl";
import { shallowEqual } from "@web/core/utils/objects";

const formatters = {
    date: formatDate,
    datetime: formatDateTime,
};

const parsers = {
    date: parseDate,
    datetime: parseDateTime,
};

// Helper function to mark values as raw (prevent reactivity)
function markValuesRaw(obj) {
    const copy = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === "object") {
            copy[key] = markRaw(value);
        } else {
            copy[key] = value;
        }
    }
    return copy;
}

// Helper function to stringify props for comparison
function stringifyProps(props) {
    const copy = {};
    for (const [key, value] of Object.entries(props)) {
        if (value && typeof value === "object") {
            copy[key] = JSON.stringify(value);
        } else {
            copy[key] = value;
        }
    }
    return copy;
}

patch(datetimePickerService, {
    dependencies: ["popover"],
    start(env, { popover: popoverService }) {
        const dateTimePickerList = new Set();
        return {
            create(params = {}) {
                // FIX: Define listenedElements to track event listeners
                const listenedElements = new WeakSet();
                const FOCUS_CLASSNAME = "text-primary";

                // --- Helper: Safe Convert with Jalali Support ---
                function safeConvert(operation, value) {
                    const { type } = pickerProps;
                    const convertFn = (operation === "format" ? formatters : parsers)[type];
                    const options = { tz: pickerProps.tz, format: params.format };
                    
                    if (operation === "format") {
                        options.showSeconds = params.showSeconds ?? true;
                        // Jalali Formatting
                        if (localization.code === "fa_IR" && value && typeof value === "object" && value.isValid) {
                            const isDateTime = type === "datetime";
                            let formatOptions = {
                                calendar: "persian",
                                numberingSystem: "persian",
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                            };
                            if (isDateTime) {
                                Object.assign(formatOptions, {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: false,
                                });
                            }
                            return [value.toLocaleString(formatOptions), null];
                        }
                    }
                    
                    try {
                        return [convertFn(value, options), null];
                    } catch (error) {
                        if (error?.name === "ConversionError") {
                            return [null, error];
                        } else {
                            throw error;
                        }
                    }
                }
                // ---------------------------------------------------

                async function apply() {
                    const { value } = pickerProps;
                    const stringValue = JSON.stringify(value);
                    if (
                        stringValue === lastAppliedStringValue ||
                        stringValue === stringProps.value
                    ) {
                        return;
                    }
                    lastAppliedStringValue = stringValue;
                    inputsChanged = ensureArray(value).map(() => false);
                    await params.onApply?.(value);
                    stringProps.value = stringValue;
                }

                function enable() {
                    for (const [el, value] of zip(
                        getInputs(),
                        ensureArray(pickerProps.value),
                        true
                    )) {
                        updateInput(el, value);
                        if (el && !el.disabled && !el.readOnly && !listenedElements.has(el)) {
                            listenedElements.add(el);
                            el.addEventListener("change", onInputChange);
                            el.addEventListener("click", onInputClick);
                            el.addEventListener("focus", onInputFocus);
                            el.addEventListener("keydown", onInputKeydown);
                        }
                    }
                    const calendarIconGroupEl = getInput(0)?.parentElement.querySelector(
                        ".o_input_group_date_icon"
                    );
                    if (calendarIconGroupEl) {
                        calendarIconGroupEl.classList.add("cursor-pointer");
                        calendarIconGroupEl.addEventListener("click", () => open(0));
                    }
                    return () => {};
                }

                function focusActiveInput() {
                    const inputEl = getInput(pickerProps.focusedDateIndex);
                    if (!inputEl) {
                        shouldFocus = true;
                        return;
                    }
                    const { activeElement } = inputEl.ownerDocument;
                    if (activeElement !== inputEl) {
                        inputEl.focus();
                    }
                    setInputFocus(inputEl);
                }

                function getInput(valueIndex) {
                    const el = getInputs()[valueIndex];
                    if (el?.isConnected) {
                        return el;
                    }
                    return null;
                }

                function getPopoverTarget() {
                    const target = getTarget();
                    if (target) {
                        return target;
                    }
                    if (pickerProps.range) {
                        let parentElement = getInput(0).parentElement;
                        const inputEls = getInputs();
                        while (
                            parentElement &&
                            !inputEls.every((inputEl) => parentElement.contains(inputEl))
                        ) {
                            parentElement = parentElement.parentElement;
                        }
                        return parentElement || getInput(0);
                    } else {
                        return getInput(0);
                    }
                }

                function getTarget() {
                    return targetRef ? targetRef.el : params.target;
                }

                function isOpen() {
                    return popover.isOpen;
                }

                function onInputChange(ev) {
                    updateValueFromInputs();
                    inputsChanged[ev.target === getInput(1) ? 1 : 0] = true;
                    if (!isOpen() || inputsChanged.every(Boolean)) {
                        saveAndClose();
                    }
                }

                function onInputClick({ target }) {
                    open(target === getInput(1) ? 1 : 0);
                }

                function onInputFocus({ target }) {
                    pickerProps.focusedDateIndex = target === getInput(1) ? 1 : 0;
                    setInputFocus(target);
                }

                function onInputKeydown(ev) {
                    if (ev.key == "Enter" && ev.ctrlKey) {
                        ev.preventDefault();
                        updateValueFromInputs();
                        return open(ev.target === getInput(1) ? 1 : 0);
                    }
                    switch (ev.key) {
                        case "Enter":
                        case "Escape": {
                            return saveAndClose();
                        }
                        case "Tab": {
                            if (
                                !getInput(0) ||
                                !getInput(1) ||
                                ev.target !== getInput(ev.shiftKey ? 1 : 0)
                            ) {
                                return saveAndClose();
                            }
                        }
                    }
                }

                function open(inputIndex) {
                    pickerProps.focusedDateIndex = inputIndex;
                    if (!isOpen()) {
                        const popoverTarget = getPopoverTarget();
                        if (ensureVisibility()) {
                            const { marginBottom } = popoverTarget.style;
                            popoverTarget.style.marginBottom = `100vh`;
                            popoverTarget.scrollIntoView(true);
                            restoreTargetMargin = async () => {
                                popoverTarget.style.marginBottom = marginBottom;
                            };
                        }
                        for (const picker of dateTimePickerList) {
                            picker.close();
                        }
                        popover.open(popoverTarget, { pickerProps });
                    }
                    focusActiveInput();
                }

                function saveAndClose() {
                    if (isOpen()) {
                        popover.close();
                    } else {
                        apply();
                    }
                }

                function setFocusClass(input) {
                    for (const el of getInputs()) {
                        if (el) {
                            el.classList.toggle(FOCUS_CLASSNAME, isOpen() && el === input);
                        }
                    }
                }

                function setInputFocus(inputEl) {
                    inputEl.selectionStart = 0;
                    inputEl.selectionEnd = inputEl.value.length;
                    setFocusClass(inputEl);
                    shouldFocus = false;
                }

                function updateInput(el, value) {
                    if (!el) {
                        return;
                    }
                    const [formattedValue] = safeConvert("format", value);
                    el.value = formattedValue || "";
                }

                function updateValue(value, unit, source) {
                    if (source === "input" && areDatesEqual(pickerProps.value, value)) {
                        return;
                    }
                    pickerProps.value = value;
                    if (pickerProps.range && unit !== "time" && source === "picker") {
                        if (!value[0]) {
                            pickerProps.focusedDateIndex = 0;
                        } else if (
                            pickerProps.focusedDateIndex === 0 ||
                            (value[0] && value[1] && value[1] < value[0])
                        ) {
                            const { year, month, day } = value[pickerProps.focusedDateIndex];
                            for (let i = 0; i < value.length; i++) {
                                value[i] = value[i] && value[i].set({ year, month, day });
                            }
                            pickerProps.focusedDateIndex = 1;
                        } else {
                            pickerProps.focusedDateIndex =
                                pickerProps.focusedDateIndex === 1 ? 0 : 1;
                        }
                    }
                    params.onChange?.(value);
                }

                function updateValueFromInputs() {
                    const values = zipWith(
                        getInputs(),
                        ensureArray(pickerProps.value),
                        (el, currentValue) => {
                            if (!el || el.tagName?.toLowerCase() !== "input") {
                                return currentValue;
                            }
                            // Jalali Parse Prevention
                            if (localization.code === "fa_IR") {
                                const [currentFormatted] = safeConvert("format", currentValue);
                                if (el.value === currentFormatted) {
                                    return currentValue;
                                }
                            }
                            const [parsedValue, error] = safeConvert("parse", el.value);
                            if (error) {
                                updateInput(el, currentValue);
                                return currentValue;
                            } else {
                                return parsedValue;
                            }
                        }
                    );
                    updateValue(values.length === 2 ? values : values[0], "date", "input");
                }

                const createPopover =
                    params.createPopover ||
                    function defaultCreatePopover(...args) {
                        return makePopover(popoverService.add, ...args);
                    };
                const ensureVisibility =
                    params.ensureVisibility ||
                    function defaultEnsureVisibility() {
                        return env.isSmall;
                    };
                const getInputs =
                    params.getInputs ||
                    function defaultGetInputs() {
                        return [getTarget(), null];
                    };

                const rawPickerProps = {
                    ...DateTimePicker.defaultProps,
                    onReset: () => {
                        updateValue(
                            ensureArray(pickerProps.value).length === 2 ? [false, false] : false,
                            "date",
                            "picker"
                        );
                        saveAndClose();
                    },
                    onSelect: (value, unit) => {
                        value &&= markRaw(value);
                        updateValue(value, unit, "picker");
                        if (!pickerProps.range && pickerProps.type === "date") {
                            saveAndClose();
                        }
                    },
                    ...markValuesRaw(params.pickerProps),
                };

                const pickerProps = reactive(rawPickerProps, () => {
                    for (const [el, value] of zip(
                        getInputs(),
                        ensureArray(pickerProps.value),
                        true
                    )) {
                        if (el) {
                            updateInput(el, value);
                            if (!isOpen()) {
                                apply();
                            }
                        }
                    }
                    shouldFocus = true;
                });

                const popover = createPopover(DateTimePickerPopover, {
                    async onClose() {
                        updateValueFromInputs();
                        setFocusClass(null);
                        restoreTargetMargin?.();
                        restoreTargetMargin = null;
                        await apply();
                        params.onClose?.();
                    },
                });

                let inputsChanged = [];
                let lastAppliedStringValue = "";
                let restoreTargetMargin = null;
                let shouldFocus = false;
                let stringProps = {};
                let targetRef = null;

                if (params.useOwlHooks) {
                    if (typeof params.target === "string") {
                        targetRef = useRef(params.target);
                    }
                    onWillRender(function computeBasePickerProps() {
                        const nextProps = markValuesRaw(params.pickerProps);
                        const oldStringProps = stringProps;
                        stringProps = stringifyProps(nextProps);
                        lastAppliedStringValue = stringProps.value;
                        if (shallowEqual(oldStringProps, stringProps)) {
                            return;
                        }
                        inputsChanged = ensureArray(nextProps.value).map(() => false);
                        for (const [key, value] of Object.entries(nextProps)) {
                            if (!areDatesEqual(pickerProps[key], value)) {
                                pickerProps[key] = value;
                            }
                        }
                    });
                    useEffect(enable, getInputs);
                    onPatched(function focusIfNeeded() {
                        if (isOpen() && shouldFocus) {
                            focusActiveInput();
                        }
                    });
                } else if (typeof params.target === "string") {
                    throw new Error(
                        `datetime picker service error: cannot use target as ref name when not using Owl hooks`
                    );
                }

                const picker = {
                    enable,
                    disable: () => dateTimePickerList.delete(picker),
                    isOpen,
                    open,
                    close: () => popover.close(),
                    state: pickerProps,
                };
                dateTimePickerList.add(picker);
                return picker;
            },
        };
    },
});