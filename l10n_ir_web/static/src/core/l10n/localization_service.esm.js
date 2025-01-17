/** @odoo-module **/

import {_t, translatedTerms} from "@web/core/l10n/translation";

import {browser} from "@web/core/browser/browser";
import {localization} from "@web/core/l10n/localization";
import {registry} from "@web/core/registry";
import {session} from "@web/session";
import {strftimeToLuxonFormat} from "@web/core/l10n/dates";

const {Settings} = luxon;

/** @type {[RegExp, string][]} */
const NUMBERING_SYSTEMS = [
    [/^ar-(sa|sy|001)$/i, "arab", "iso8601"],
    [/^bn/i, "beng", "iso8601"],
    [/^bo/i, "tibt", "iso8601"],
    [/^fa/i, "persian", "persian"],
    // [/^(hi|mr|ne)/i, "Hindi", "iso8601"], // No numberingSystem found in Intl
    // [/^my/i, "Burmese", "iso8601"], // No numberingSystem found in Intl
    [/^pa-in/i, "guru", "iso8601"],
    [/^ta/i, "tamldec", "iso8601"],
    [/.*/i, "latn", "iso8601"],
];

export const localizationService = {
    dependencies: ["user"],
    start: async (env, {user}) => {
        const cacheHashes = session.cache_hashes || {};
        const translationsHash = cacheHashes.translations || new Date().getTime().toString();
        const lang = user.lang || null;
        const translationURL = session.translationURL || "/web/webclient/translations";
        let url = `${translationURL}/${translationsHash}`;
        if (lang) {
            url += `?lang=${lang}`;
        }

        const response = await browser.fetch(url);
        if (!response.ok) {
            throw new Error("Error while fetching translations");
        }

        const {lang_parameters: userLocalization, modules, multi_lang: multiLang} = await response.json();

        // FIXME We flatten the result of the python route.
        // Eventually, we want a new python route to return directly the good result.
        const terms = {};
        for (const addon of Object.keys(modules)) {
            for (const message of modules[addon].messages) {
                terms[message.id] = message.string;
            }
        }

        Object.setPrototypeOf(translatedTerms, terms);
        env._t = _t;

        if (lang) {
            // Setup lang inside luxon. The locale codes received from the server contain "_",
            // whereas the Intl codes use "-" (Unicode BCP 47). There's only one exception, which
            // is locale "sr@latin", for which we manually fallback to the "sr-Latn-RS" locale.
            const locale = lang === "sr@latin" ? "sr-Latn-RS" : lang.replace(/_/g, "-");
            Settings.defaultLocale = locale;
            for (const [re, numberingSystem, outputCalendar] of NUMBERING_SYSTEMS) {
                if (re.test(locale)) {
                    Settings.defaultNumberingSystem = numberingSystem;
                    Settings.defaultOutputCalendar = outputCalendar;
                    break;
                }
            }
        }

        const dateFormat = strftimeToLuxonFormat(userLocalization.date_format);
        const timeFormat = strftimeToLuxonFormat(userLocalization.time_format);
        const dateTimeFormat = `${dateFormat} ${timeFormat}`;
        const grouping = JSON.parse(userLocalization.grouping);

        Object.assign(localization, {
            dateFormat,
            timeFormat,
            dateTimeFormat,
            decimalPoint: userLocalization.decimal_point,
            direction: userLocalization.direction,
            grouping,
            multiLang,
            thousandsSep: userLocalization.thousands_sep,
            weekStart: userLocalization.week_start,
        });
    },
};

registry.category("services").add("localization", localizationService);
