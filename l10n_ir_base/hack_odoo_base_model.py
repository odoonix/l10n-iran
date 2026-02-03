import datetime
import math

import babel.dates
import dateutil
import jdatetime
import pytz
from persiantools import digits

from odoo import api
from odoo.models import BaseModel
from odoo.osv import expression
from odoo.tools import (
    DEFAULT_SERVER_DATE_FORMAT,
    DEFAULT_SERVER_DATETIME_FORMAT,
    get_lang,
)

quarter_jalali = ["بهار", "تابستان", "پاییز", "زمستان"]


@api.model
def format_label_custom(gb, jdate):
    if gb["granularity"] == "quarter":
        quarter = math.ceil((jdate.month) / 3) - 1
        label = quarter_jalali[quarter] + " " + str(jdate.year)
    else:
        label = jdate.strftime(gb["display_format_jalali"])
    label = digits.en_to_fa(label)
    return label


@api.model
def _read_group_process_groupby(self, gb, query):
    """
    Helper method to collect important information about groupbys: raw
    field name, type, time information, qualified name, ...
    """
    split = gb.split(":")
    field = self._fields.get(split[0])
    if not field:
        raise ValueError("Invalid field %r on model %r" %
                         (split[0], self._name))
    field_type = field.type
    gb_function = split[1] if len(split) == 2 else None
    temporal = field_type in ("date", "datetime")
    tz_convert = (
        field_type == "datetime" and self._context.get(
            "tz") in pytz.all_timezones
    )
    qualified_field = self._inherits_join_calc(self._table, split[0], query)
    if temporal:
        display_formats = {
            # Careful with week/year formats:
            #  - yyyy (lower) must always be used, *except* for week+year formats
            #  - YYYY (upper) must always be used for week+year format
            #         e.g. 2006-01-01 is W52 2005 in some locales (de_DE),
            #                         and W1 2006 for others
            #
            # Mixing both formats, e.g. 'MMM YYYY' would yield wrong results,
            # such as 2006-01-01 being formatted as "January 2005" in some locales.
            # Cfr: http://babel.pocoo.org/en/latest/dates.html#date-fields
            "hour": "hh:00 dd MMM",
            "day": "dd MMM yyyy",
            "week": "'W'w YYYY",
            "month": "MMMM yyyy",
            "quarter": "QQQ yyyy",
            "year": "yyyy",
        }
        display_format_jalali = {
            "hour": "%H:00 %d %B",
            "day": "%d %B %Y",
            "week": "%W %Y",
            "month": "%B %Y",
            "quarter": "%B",
            "year": "%Y",
        }
        time_intervals = {
            "hour": dateutil.relativedelta.relativedelta(hours=1),
            "day": dateutil.relativedelta.relativedelta(days=1),
            "week": datetime.timedelta(days=7),
            "month": dateutil.relativedelta.relativedelta(months=1),
            "quarter": dateutil.relativedelta.relativedelta(months=3),
            "year": dateutil.relativedelta.relativedelta(years=1),
        }
        if tz_convert:
            qualified_field = "timezone('%s', timezone('UTC',%s))" % (
                self._context.get("tz", "UTC"),
                qualified_field,
            )
        qualified_field = "date_trunc('%s', %s::timestamp)" % (
            gb_function or "month",
            qualified_field,
        )
    if field_type == "boolean":
        qualified_field = "coalesce(%s,false)" % qualified_field
    return {
        "field": split[0],
        "groupby": gb,
        "type": field_type,
        "display_format": display_formats[gb_function or "month"] if temporal else None,
        "display_format_jalali": (
            display_format_jalali[gb_function or "month"] if temporal else None
        ),
        "interval": time_intervals[gb_function or "month"] if temporal else None,
        "granularity": gb_function or "month" if temporal else None,
        "tz_convert": tz_convert,
        "qualified_field": qualified_field,
    }


@api.model
def _read_group_format_result(self, data, annotated_groupbys, groupby, domain):
    """
        Helper method to format the data contained in the dictionary data by
        adding the domain corresponding to its values, the groupbys in the
        context and by properly formatting the date/datetime values.

    :param data: a single group
    :param annotated_groupbys: expanded grouping metainformation
    :param groupby: original grouping metainformation
    :param domain: original domain for read_group
    """
    lang = get_lang(self.env)

    sections = []
    for gb in annotated_groupbys:
        ftype = gb["type"]
        value = data[gb["groupby"]]

        # full domain for this groupby spec
        d = None
        if value:
            if ftype in ["many2one", "many2many"]:
                value = value[0]
            elif ftype in ("date", "datetime"):
                locale = get_lang(self.env).code
                fmt = (
                    DEFAULT_SERVER_DATETIME_FORMAT
                    if ftype == "datetime"
                    else DEFAULT_SERVER_DATE_FORMAT
                )
                tzinfo = None
                range_start = value
                range_end = value + gb["interval"]
                # value from postgres is in local tz (so range is
                # considered in local tz e.g. "day" is [00:00, 00:00[
                # local rather than UTC which could be [11:00, 11:00]
                # local) but domain and raw value should be in UTC
                if gb["tz_convert"]:
                    tzinfo = range_start.tzinfo
                    range_start = range_start.astimezone(pytz.utc)
                    # take into account possible hour change between start and end
                    range_end = tzinfo.localize(range_end.replace(tzinfo=None))
                    range_end = range_end.astimezone(pytz.utc)

                range_start = range_start.strftime(fmt)
                range_end = range_end.strftime(fmt)
                if ftype == "datetime":
                    if lang.code == "fa_IR":
                        jdate = jdatetime.datetime.fromgregorian(
                            date=value, locale="fa_IR"
                        )
                        label = format_label_custom(gb=gb, jdate=jdate)
                    else:
                        label = babel.dates.format_datetime(
                            value,
                            format=gb["display_format"],
                            tzinfo=tzinfo,
                            locale=locale,
                        )
                else:
                    if lang.code == "fa_IR":
                        jdate = jdatetime.datetime.fromgregorian(
                            date=value, locale="fa_IR"
                        )
                        label = format_label_custom(gb=gb, jdate=jdate)
                    else:
                        label = babel.dates.format_date(
                            value, format=gb["display_format"], locale=locale
                        )
                data[gb["groupby"]] = (
                    "%s/%s" % (range_start, range_end), label)
                data.setdefault("__range", {})[gb["groupby"]] = {
                    "from": range_start,
                    "to": range_end,
                }
                d = [
                    "&",
                    (gb["field"], ">=", range_start),
                    (gb["field"], "<", range_end),
                ]
        elif ftype in ("date", "datetime"):
            # Set the __range of the group containing records with an unset
            # date/datetime field value to False.
            data.setdefault("__range", {})[gb["groupby"]] = False

        if d is None:
            d = [(gb["field"], "=", value)]
        sections.append(d)
    sections.append(domain)

    data["__domain"] = expression.AND(sections)
    if len(groupby) - len(annotated_groupbys) >= 1:
        data["__context"] = {"group_by": groupby[len(annotated_groupbys):]}
    del data["id"]
    return data


#
# Patch the base model
#
BaseModel._read_group_format_result = _read_group_format_result
BaseModel._read_group_process_groupby = _read_group_process_groupby
