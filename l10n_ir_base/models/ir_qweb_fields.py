import datetime

##################################################################################################
# Viraweb123 Patch
# TODO: move this part into the patch project
##################################################################################################
import jdatetime
from markupsafe import Markup
from persiantools import digits

import odoo
from odoo import api, fields, models
from odoo.tools import format_date
from odoo.tools.misc import get_lang

DEFAULT_SERVER_DATE_FORMAT = "%Y-%m-%d"
DEFAULT_SERVER_TIME_FORMAT = "%H:%M:%S"
DEFAULT_SERVER_DATETIME_FORMAT = "%s %s" % (
    DEFAULT_SERVER_DATE_FORMAT,
    DEFAULT_SERVER_TIME_FORMAT)

DATE_LENGTH = len(datetime.date.today().strftime(DEFAULT_SERVER_DATE_FORMAT))

format_date_org = format_date


def hack_format_date(env, value, lang_code=False, date_format=False):
    lang = get_lang(env, lang_code)

    if lang.code != 'fa_IR':
        return format_date_org(env, value, lang_code, date_format)

    if not value:
        return ''
    if isinstance(value, str):
        if len(value) < DATE_LENGTH:
            return ''
        if len(value) > DATE_LENGTH:
            # a datetime, convert to correct timezone
            value = odoo.fields.Datetime.from_string(value)
            value = odoo.fields.Datetime.context_timestamp(env['res.lang'], value)
        else:
            value = odoo.fields.Datetime.from_string(value)
    elif isinstance(value, datetime.datetime) and not value.tzinfo:
        # a datetime, convert to correct timezone
        value = odoo.fields.Datetime.context_timestamp(env['res.lang'], value)

    if not date_format:
        date_format = lang.date_format

    # Converto to Persian data time
    jdate = jdatetime.datetime.fromgregorian(date=value)
    strval = jdate.strftime(date_format)
    strval = digits.en_to_fa(strval)
    return strval

# parse_date
# format_datetime

# hacks
# _logger.info("patching tools.format_date")
# format_date=hack_format_date


##################################################################################################
# Fields
##################################################################################################
class FieldConverter(models.AbstractModel):
    _inherit = 'ir.qweb.field'

    @api.model
    def value_to_html(self, value, options):
        if self.user_lang().code == 'fa_IR':
            value = digits.en_to_fa(value)
        return super().value_to_html(value, options)


class ManyToOneConverter(models.AbstractModel):
    _inherit = 'ir.qweb.field.many2one'

    @api.model
    def value_to_html(self, value, options):
        res = super().value_to_html(value, options)
        if self.user_lang().code == 'fa_IR':
            return digits.en_to_fa(str(res))
        return res


class IntegerConverter(models.AbstractModel):
    _inherit = 'ir.qweb.field.integer'

    @api.model
    def value_to_html(self, value, options):
        res = super().value_to_html(value, options)
        if self.user_lang().code == 'fa_IR':
            return digits.en_to_fa(str(res))
        return res


class TextConverter(models.AbstractModel):
    _inherit = 'ir.qweb.field.text'

    @api.model
    def value_to_html(self, value, options):
        if self.user_lang().code == 'fa_IR':
            value = digits.en_to_fa(str(value))
        return super().value_to_html(value, options)


class PhoneConverter(models.AbstractModel):
    _name = 'ir.qweb.field.phone'
    _description = 'Qweb Field Phone Number'
    _inherit = 'ir.qweb.field'

    @api.model
    def value_to_html(self, value, options):
        lang = self.user_lang()
        if lang.code == 'fa_IR':
            value = digits.en_to_fa(value)
            patt = '<pre style="display:inline;direction:ltr; padding: 0px; margin: 0px;">{}</pre>'
        else:
            patt = '<pre style="display:inline;padding: 0px; margin: 0px;">{}</pre>'
        return Markup(patt).format(value)


class DateConverter(models.AbstractModel):
    _inherit = 'ir.qweb.field.date'

    @api.model
    def value_to_html(self, value, options):
        if not value:
            return ''

        lang = self.user_lang()
        if lang.code != 'fa_IR':
            return super().value_to_html(value, options)

        return hack_format_date(self.env, value, date_format=options.get('format'))


class DateTimeConverter(models.AbstractModel):
    _inherit = 'ir.qweb.field.datetime'

    @api.model
    def value_to_html(self, value, options):
        if not value:
            return ''

        lang = self.user_lang()
        if lang.code != 'fa_IR':
            return super().value_to_html(value, options)

        # Calculate time
        # locale = babel_locale_parse(lang.code)
        # format_func = babel.dates.format_datetime
        if isinstance(value, str):
            value = fields.Datetime.from_string(value)

        if options.get('tz_name'):
            self = self.with_context(tz=options['tz_name'])
        #     tzinfo = babel.dates.get_timezone(options['tz_name'])
        # else:
        #     tzinfo = None

        value = fields.Datetime.context_timestamp(self, value)

        # Format output
        if 'format' in options:
            pattern = options['format']
        else:
            if options.get('time_only'):
                strftime_pattern = ("%s" % (lang.time_format))
            elif options.get('date_only'):
                strftime_pattern = ("%s" % (lang.date_format))
            else:
                strftime_pattern = ("%s %s" % (lang.date_format, lang.time_format))

            # pattern = posix_to_ldml(strftime_pattern, locale=locale)
            pattern = strftime_pattern

        if options.get('hide_seconds'):
            pattern = pattern.replace("%S", "").replace("%-S", "")

        # if options.get('time_only'):
        #     format_func = babel.dates.format_time
        #     return pycompat.to_text(format_func(value, format=pattern,
        # tzinfo=tzinfo, locale=locale))
        # if options.get('date_only'):
        #     format_func = babel.dates.format_date
        #     return pycompat.to_text(format_func(value, format=pattern,
        # locale=locale))

        # return pycompat.to_text(format_func(value, format=pattern,
        # tzinfo=tzinfo, locale=locale))
        newVal = hack_format_date(self.env, value, date_format=pattern)
        patt = '<pre style="display:inline;padding: 0px; margin: 0px;">{}</pre>'
        return Markup(patt).format(newVal)
