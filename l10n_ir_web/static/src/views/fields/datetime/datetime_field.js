/** @odoo-module **/

import {registry} from "@web/core/registry";
import {localization} from "@web/core/l10n/localization";

const f = registry.category("formatters");

const origDate = f.get("date");
const origDT = f.get("datetime");

const jDate = (v) =>
    v?.toLocaleString({
        calendar: "persian",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }) || "";

const jDT = (v) =>
    v?.toLocaleString({
        calendar: "persian",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }) || "";

f.add("date", (v, o) =>
    localization.code === "fa_IR" ? jDate(v) : origDate(v, o),
{force: true});

f.add("datetime", (v, o) =>
    localization.code === "fa_IR" ? jDT(v) : origDT(v, o),
{force: true});


