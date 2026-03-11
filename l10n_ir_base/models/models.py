# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import datetime
import math

import babel.dates
import jdatetime
import pytz
from persiantools import digits

from odoo import api, models
from odoo.osv import expression
from odoo.tools import (
    DEFAULT_SERVER_DATE_FORMAT,
    DEFAULT_SERVER_DATETIME_FORMAT,
    get_lang,
    date_utils
)

# ثابت‌های مورد نیاز (اگر در محیط شما تعریف نشده‌اند، اینجا تعریف می‌شوند)
# معمولا این‌ها در odoo.tools یا odoo.models تعریف هستند اما برای اطمینان:
READ_GROUP_TIME_GRANULARITY = {
    'day': datetime.timedelta(days=1),
    'week': datetime.timedelta(days=7),
    'month': datetime.timedelta(days=30), # تقریبی
    'quarter': datetime.timedelta(days=90), # تقریبی
    'year': datetime.timedelta(days=365),
}

READ_GROUP_DISPLAY_FORMAT = {
    'day': 'dd MMM yyyy',
    'week': "'W'w YYYY",
    'month': 'MMMM yyyy',
    'quarter': 'QQQ yyyy',
    'year': 'yyyy',
}

READ_GROUP_NUMBER_GRANULARITY = [] # معمولا برای فیلدهای عددی استفاده می‌شود


class BaseModel(models.AbstractModel):
    _inherit = 'base'

    @api.model
    def format_label_custom(self, gb, jdate):
        """
        Helper method to format the Jalali label based on granularity.
        """
        # لیست نام فصل‌های شمسی (باید در کلاس یا ماژول تعریف شده باشد)
        # اگر تعریف نشده، اینجا اضافه می‌کنیم:
        quarter_jalali = ['بهار', 'تابستان', 'پاییز', 'زمستان']

        # در نسخه ۱۸، gb یک رشته است (مثل 'date:month')، نه دیکشنری
        granularity = gb

        if granularity == "quarter":
            quarter = math.ceil((jdate.month) / 3) - 1
            label = quarter_jalali[quarter] + " " + str(jdate.year)
        else:
            # فرمت‌های پیش‌فرض برای شمسی
            formats = {
                'day': '%Y/%m/%d',
                'week': '%W %Y', # هفته و سال
                'month': '%Y %B', # سال و نام ماه
                'year': '%Y',
            }
            fmt = formats.get(granularity, '%Y %m')
            label = jdate.strftime(fmt)
        return label


    @api.model
    def _read_group_format_result(self, rows_dict, lazy_groupby):
        """
        Helper method to format the data contained in the dictionary data by
        adding the domain corresponding to its values, the groupbys in the
        context and by properly formatting the date/datetime values.

        :param data: a single group
        :param annotated_groupbys: expanded grouping metainformation
        :param groupby: original grouping metainformation
        """
        lang = get_lang(self.env)

        for group in lazy_groupby:
            field_name = group.split(':')[0].split('.')[0]
            field = self._fields[field_name]

            if field.type in ('date', 'datetime'):
                granularity = group.split(':')[1] if ':' in group else 'month'
                if granularity in READ_GROUP_TIME_GRANULARITY:
                    locale = get_lang(self.env).code

                    if field.type == 'datetime':
                        fmt = DEFAULT_SERVER_DATETIME_FORMAT
                    else:
                        fmt = DEFAULT_SERVER_DATE_FORMAT
                    interval = READ_GROUP_TIME_GRANULARITY[granularity]
                elif field.type == "properties":
                    self._read_group_format_result_properties(rows_dict, group)
                    continue

            for row in rows_dict:
                value = row[group]

                if isinstance(value, models.BaseModel):
                    row[group] = (
                        value.id, value.sudo().display_name) if value else False
                    value = value.id

                if not value and field.type == 'many2many':
                    additional_domain = [(field_name, 'not any', [])]
                else:
                    additional_domain = [(field_name, '=', value)]

                if field.type in ('date', 'datetime'):
                    if value and isinstance(value, (datetime.date, datetime.datetime)):
                        range_start = value
                        range_end = value + interval
                        if field.type == 'datetime':
                            tzinfo = None
                            if self._context.get('tz') in pytz.all_timezones_set:
                                tzinfo = pytz.timezone(self._context['tz'])
                                range_start = tzinfo.localize(
                                    range_start).astimezone(pytz.utc)
                                # take into account possible hour change between start
                                # and end
                                range_end = tzinfo.localize(
                                    range_end).astimezone(pytz.utc)

                        # --- تغییرات شمسی ---
                        if lang.code == "fa_IR":
                            jdate = jdatetime.datetime.fromgregorian(
                                date=value, locale="fa_IR")
                            label = self.format_label_custom(granularity, jdate)
                        else:
                            # --- منطق استاندارد اصلی اودوو ---
                            if field.type == 'datetime':
                                label = babel.dates.format_datetime(
                                    range_start,
                                    format=READ_GROUP_DISPLAY_FORMAT[granularity],
                                    tzinfo=tzinfo, locale=locale
                                )
                            else:
                                label = babel.dates.format_date(
                                    value,
                                    format=READ_GROUP_DISPLAY_FORMAT[granularity],
                                    locale=locale
                                )
                            # special case weeks because babel is broken _and_
                            # ubuntu reverted a change so it's also inconsistent
                            if granularity == 'week':
                                year, week = date_utils.weeknumber(
                                    babel.Locale.parse(locale),
                                    value,
                                    # provide date or datetime without UTC conversion
                                )
                                label = f"W{week} {year:04}"

                        range_start = range_start.strftime(fmt)
                        range_end = range_end.strftime(fmt)
                        row[group] = label  # TODO should put raw data
                        row.setdefault('__range', {})[group] = {
                            'from': range_start, 'to': range_end
                        }
                        additional_domain = [
                            '&',
                            (field_name, '>=', range_start),
                            (field_name, '<', range_end),
                        ]
                    elif (value is not None) and (
                        granularity in READ_GROUP_NUMBER_GRANULARITY):
                        additional_domain = [
                            (f"{field_name}.{granularity}", '=', value)]
                    elif not value:
                        # Set the __range of the group containing records with an unset
                        # date/datetime field value to False.
                        row.setdefault('__range', {})[group] = False

                row['__domain'] = expression.AND([row['__domain'], additional_domain])


    # @api.model
    # def _read_group_process_groupby(self, gb, query):
    #     """
    #     Helper method to collect important information about groupbys: raw
    #     field name, type, time information, qualified name, ...
    #     """
    #     split = gb.split(":")
    #     field = self._fields.get(split[0])
    #     if not field:
    #         raise ValueError(
    #             self.env._(
    #                 "Invalid field %(field)s on model %(model)s",
    #                 field=split[0],
    #                 model=self._name,
    #             )
    #         )
    #     field_type = field.type
    #     gb_function = split[1] if len(split) == 2 else None
    #     temporal = field_type in ("date", "datetime")
    #     tz_convert = (
    #         field_type == "datetime" and self._context.get("tz") in pytz.all_timezones
    #     )
    #     qualified_field = self._inherits_join_calc(self._table, split[0], query)
    #     if temporal:
    #         display_formats = {
    #             # Careful with week/year formats:
    #             #  - yyyy (lower) must always be used, *except* for week+year formats
    #             #  - YYYY (upper) must always be used for week+year format
    #             #         e.g. 2006-01-01 is W52 2005 in some locales (de_DE),
    #             #                         and W1 2006 for others
    #             #
    #             # Mixing both formats, e.g. 'MMM YYYY' would yield wrong results,
    #            # such as 2006-01-01 being formatted as "January 2005" in some locales.
    #             # Cfr: http://babel.pocoo.org/en/latest/dates.html#date-fields
    #             "hour": "hh:00 dd MMM",
    #             "day": "dd MMM yyyy",
    #             "week": "'W'w YYYY",
    #             "month": "MMMM yyyy",
    #             "quarter": "QQQ yyyy",
    #             "year": "yyyy",
    #         }
    #         display_format_jalali = {
    #             "hour": "%H:00 %d %B",
    #             "day": "%d %B %Y",
    #             "week": "%W %Y",
    #             "month": "%B %Y",
    #             "quarter": "%B",
    #             "year": "%Y",
    #         }
    #         time_intervals = {
    #             "hour": dateutil.relativedelta.relativedelta(hours=1),
    #             "day": dateutil.relativedelta.relativedelta(days=1),
    #             "week": datetime.timedelta(days=7),
    #             "month": dateutil.relativedelta.relativedelta(months=1),
    #             "quarter": dateutil.relativedelta.relativedelta(months=3),
    #             "year": dateutil.relativedelta.relativedelta(years=1),
    #         }
    #         if tz_convert:
    #             qualified_field = "timezone('%s', timezone('UTC',%s))" % (
    #                 self._context.get("tz", "UTC"),
    #                 qualified_field,
    #             )
    #         qualified_field = "date_trunc('%s', %s::timestamp)" % (
    #             gb_function or "month",
    #             qualified_field,
    #         )
    #     if field_type == "boolean":
    #         qualified_field = "coalesce(%s,false)" % qualified_field
    #     return {
    #         "field": split[0],
    #         "groupby": gb,
    #         "type": field_type,
    #   "display_format": display_formats[gb_function or "month"] if temporal else None,
    #         "display_format_jalali": (
    #             display_format_jalali[gb_function or "month"] if temporal else None
    #         ),
    #         "interval": time_intervals[gb_function or "month"] if temporal else None,
    #         "granularity": gb_function or "month" if temporal else None,
    #         "tz_convert": tz_convert,
    #         "qualified_field": qualified_field,
    #     }
