/** @odoo-module **/
import { markRaw, reactive } from "@odoo/owl";
import { areDatesEqual, formatDate, formatDateTime, parseDate, parseDateTime } from "@web/core/l10n/dates";
import { makePopover } from "@web/core/popover/popover_hook";
import { ensureArray, zip, zipWith } from "@web/core/utils/arrays";
import { deepCopy, shallowEqual } from "@web/core/utils/objects";
import { DateTimePicker } from "@web/core/datetime/datetime_picker";
import { DateTimePickerPopover } from "@web/core/datetime/datetime_picker_popover";
import { patch } from "@web/core/utils/patch";
import { localization } from "@web/core/l10n/localization";
import { datetimePickerService } from "@web/core/datetime/datetimepicker_service";

const arePropsEqual = (obj1, obj2) =>
    shallowEqual(obj1, obj2, (a, b) => areDatesEqual(a, b) || shallowEqual(a, b));

const FOCUS_CLASSNAME = "text-primary";

const formatters = {
    date: formatDate,
    datetime: formatDateTime,
};

const listenedElements = new WeakSet();

const parsers = {
    date: parseDate,
    datetime: parseDateTime,
};

patch(datetimePickerService, {
    start(env, { popover: popoverService }) {
        return {
            create: (hookParams, getInputs = () => [hookParams.target, null]) => {
                const createPopover =
                    hookParams.createPopover ??
                    ((...args) => makePopover(popoverService.add, ...args));
                const ensureVisibility = hookParams.ensureVisibility ?? (() => env.isSmall);
                const popover = createPopover(DateTimePickerPopover, {
                    onClose: () => {
                        if (!allowOnClose) {
                            return;
                        }
                        updateValueFromInputs();
                        apply();
                        setFocusClass(null);
                        if (restoreTargetMargin) {
                            restoreTargetMargin();
                            restoreTargetMargin = null;
                        }
                    },
                });

                const apply = () => {
                    const valueCopy = deepCopy(pickerProps.value);
                    if (areDatesEqual(lastAppliedValue, valueCopy)) {
                        return;
                    }
                    inputsChanged = ensureArray(pickerProps.value).map(() => false);
                    hookParams.onApply?.(pickerProps.value);
                    lastAppliedValue = valueCopy;
                };

                const computeBasePickerProps = () => {
                    const nextInitialProps = markValuesRaw(hookParams.pickerProps);
                    const propsCopy = deepCopy(nextInitialProps);

                    if (lastInitialProps && arePropsEqual(lastInitialProps, propsCopy)) {
                        return;
                    }

                    lastInitialProps = propsCopy;
                    lastAppliedValue = propsCopy.value;
                    inputsChanged = ensureArray(lastInitialProps.value).map(() => false);

                    for (const [key, value] of Object.entries(nextInitialProps)) {
                        if (pickerProps[key] !== value && !areDatesEqual(pickerProps[key], value)) {
                            pickerProps[key] = value;
                        }
                    }
                };

                const focusActiveInput = () => {
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
                };

                const getInput = (valueIndex) => {
                    const el = getInputs()[valueIndex];
                    if (el && document.body.contains(el)) {
                        return el;
                    }
                    return null;
                };

                const getPopoverTarget = () => {
                    if (hookParams.target) {
                        return hookParams.target;
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
                };

                const markValuesRaw = (obj) => {
                    const copy = {};
                    for (const [key, value] of Object.entries(obj)) {
                        if (value && typeof value === "object") {
                            copy[key] = markRaw(value);
                        } else {
                            copy[key] = value;
                        }
                    }
                    return copy;
                };

                const onInputChange = (ev) => {
                    updateValueFromInputs();
                    inputsChanged[ev.target === getInput(1) ? 1 : 0] = true;
                    if (!popover.isOpen || inputsChanged.every(Boolean)) {
                        saveAndClose();
                    }
                };

                const onInputClick = ({ target }) => {
                    openPicker(target === getInput(1) ? 1 : 0);
                };

                const onInputFocus = ({ target }) => {
                    pickerProps.focusedDateIndex = target === getInput(1) ? 1 : 0;
                    setInputFocus(target);
                };

                const onInputKeydown = (ev) => {
                    if (ev.key == "Enter" && ev.ctrlKey) {
                        ev.preventDefault();
                        updateValueFromInputs();
                        return openPicker(ev.target === getInput(1) ? 1 : 0);
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
                };

                const openPicker = (inputIndex) => {
                    pickerProps.focusedDateIndex = inputIndex;

                    if (!popover.isOpen) {
                        const popoverTarget = getPopoverTarget();
                        if (ensureVisibility()) {
                            const { marginBottom } = popoverTarget.style.marginBottom;
                            popoverTarget.style.marginBottom = `100vh`;
                            popoverTarget.scrollIntoView(true);
                            restoreTargetMargin = async () => {
                                popoverTarget.style.marginBottom = marginBottom;
                            };
                        }
                        popover.open(popoverTarget, { pickerProps });
                    }

                    focusActiveInput();
                };

                // --- Modified: Correct handling of format and parse ---
                const safeConvert = (operation, value) => {
                    const { type } = pickerProps;
                    const convertFn = (operation === "format" ? formatters : parsers)[type];
                    const options = { tz: pickerProps.tz, format: hookParams.format };
                    if (operation === "format") {
                        options.showSeconds = hookParams.showSeconds ?? true;
                        options.condensed = hookParams.condensed || false;

                        if (localization.code === "fa_IR") {
                            // Only convert to Jalali if the value is a valid Luxon object
                            if (value && typeof value === "object" && value.isValid) {
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
                };
                // ------------------------------------------

                const saveAndClose = () => {
                    if (popover.isOpen) {
                        popover.close();
                    } else {
                        apply();
                    }
                };

                const setFocusClass = (input) => {
                    for (const el of getInputs()) {
                        if (el) {
                            el.classList.toggle(FOCUS_CLASSNAME, popover.isOpen && el === input);
                        }
                    }
                };

                const setInputFocus = (inputEl) => {
                    inputEl.selectionStart = 0;
                    inputEl.selectionEnd = inputEl.value.length;

                    setFocusClass(inputEl);

                    shouldFocus = false;
                };

                const updateInput = (el, value) => {
                    if (!el) {
                        return;
                    }
                    const [formattedValue] = safeConvert("format", value);
                    el.value = formattedValue || "";
                };

                const updateValue = (value, unit, source) => {
                    const previousValue = pickerProps.value;
                    pickerProps.value = value;

                    if (areDatesEqual(previousValue, pickerProps.value)) {
                        return;
                    }

                    if (unit !== "time") {
                        if (pickerProps.range && source === "picker") {
                            if (
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
                    }

                    hookParams.onChange?.(value);
                };

                // --- Modified: Prevent re-parsing of Jalali date string ---
                const updateValueFromInputs = () => {
                    const values = zipWith(
                        getInputs(),
                        ensureArray(pickerProps.value),
                        (el, currentValue) => {
                            if (!el) {
                                return currentValue;
                            }

                            // --- Start of fix ---
                            // If the value inside the input is exactly equal to the formatted display value of the current state,
                            // it means it wasn't a manual change by the user.
                            const [currentFormatted] = safeConvert("format", currentValue);
                            if (el.value === currentFormatted) {
                                return currentValue; // Return the original (Gregorian) value, don't re-parse
                            }
                            // --- End of fix ---

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
                };
                // -----------------------------------------------------------

                const rawPickerProps = {
                    ...DateTimePicker.defaultProps,
                    onSelect: (value, unit) => {
                        value &&= markRaw(value);
                        updateValue(value, unit, "picker");
                        if (!pickerProps.range && pickerProps.type === "date") {
                            saveAndClose();
                        }
                    },
                    ...markValuesRaw(hookParams.pickerProps),
                };
                const pickerProps = reactive(rawPickerProps, () => {
                    const currentIsRange = pickerProps.range;
                    if (popover.isOpen && lastIsRange !== currentIsRange) {
                        allowOnClose = false;
                        popover.open(getPopoverTarget(), { pickerProps });
                        allowOnClose = true;
                    }
                    lastIsRange = currentIsRange;

                    for (const [el, value] of zip(
                        getInputs(),
                        ensureArray(pickerProps.value),
                        true
                    )) {
                        if (el) {
                            updateInput(el, value);
                        }
                    }

                    shouldFocus = true;
                });

                let allowOnClose = true;
                let inputsChanged = [];
                let lastInitialProps = null;
                let lastAppliedValue = null;
                let lastIsRange = pickerProps.range;
                let restoreTargetMargin = null;
                let shouldFocus = false;

                return {
                    state: pickerProps,
                    open: openPicker,
                    computeBasePickerProps,
                    focusIfNeeded() {
                        if (popover.isOpen && shouldFocus) {
                            focusActiveInput();
                        }
                    },
                    enable() {
                        let editableInputs = 0;
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
                                editableInputs++;
                            }
                        }
                        const calendarIconGroupEl = getInput(0)?.parentElement.querySelector(
                            ".o_input_group_date_icon"
                        );
                        if (calendarIconGroupEl) {
                            calendarIconGroupEl.classList.add("cursor-pointer");
                            calendarIconGroupEl.addEventListener("click", () => openPicker(0));
                        }
                        if (!editableInputs && popover.isOpen) {
                            saveAndClose();
                        }
                        return () => {};
                    },
                    get isOpen() {
                        return popover.isOpen;
                    },
                };
            },
        };
    },
});