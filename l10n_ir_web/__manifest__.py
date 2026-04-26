# pylint: disable=W0104
{
    "name": "Web Iran Localization",
    "version": "18.0.1.0.0",
    "author": "Moonsun PTY LTD",
    "website": "https://github.com/moonsun/l10n-iran",
    "category": "Localization",
    "license": "AGPL-3",
    "summary": "Web Iran Localization with Jalali calendar support",
    "depends": ["web"],
    "data": [],
    "assets": {
        "web.assets_backend": [
            "l10n_ir_web/static/src/core/datetime/datetime_picker.js",
            "l10n_ir_web/static/src/core/datetime/datetimepicker_service.js",
            "l10n_ir_web/static/src/views/fields/datetime/datetime_field.js",
        ],
    },
    "installable": True,
    "application": False,
}
