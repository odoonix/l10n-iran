{
    "name": "VW Calander Support",
    "version": "16.0.1.0.0",
    "author": "ViraWeb123",
    "website": "https://github.com/OCA/iot",
    "license": "LGPL-3",
    "category": "Website",
    "depends": ["web"],
    "data": [],
    "installable": True,
    "assets": {
        # "web.assets_frontend": [
        #     (
        #         "replace",
        #         "web/static/src/core/l10n/dates.js",
        #         "l10n_ir_web/static/src/core/l10n/dates.js",
        #     ),
        #     (
        #         "replace",
        #         "web/static/src/core/l10n/localization_service.js",
        #         "l10n_ir_web/static/src/core/l10n/localization_service.js",
        #     ),
        # ],
        "web.assets_backend": [
            (
                "after",
                "web/static/src/core/l10n/dates.js",
                "l10n_ir_web/static/src/core/l10n/dates.esm.js",
            ),
            (
                "replace",
                "web/static/src/core/l10n/localization_service.js",
                "l10n_ir_web/static/src/core/l10n/localization_service.esm.js",
            ),
            # Datepicker
            "l10n_ir_web/static/src/js/core/datepicker/datepicker-variables.scss",
            "l10n_ir_web/static/src/js/core/datepicker/datepicker-helper.scss",
            # note: add theme here
            "l10n_ir_web/static/src/js/core/datepicker/datepicker-layout.scss",
            "l10n_ir_web/static/src/js/core/datepicker/calendars/*",
            "l10n_ir_web/static/src/js/core/datepicker/datepicker.esm.js",
            "l10n_ir_web/static/src/js/core/datepicker/datepicker.xml",

            "l10n_ir_web/static/src/js/hack-custom-filter-item.esm.js",

            "l10n_ir_web/static/src/js/field/date/date_field.esm.js",
            "l10n_ir_web/static/src/js/field/daterange/daterange_field.esm.js",
            "l10n_ir_web/static/src/js/field/daterange/daterange_field.xml",
            "l10n_ir_web/static/src/js/field/datetime/datetime_field.esm.js",
            "l10n_ir_web/static/src/js/field/remaining_days/remaining_days_field.esm.js",
            "l10n_ir_web/static/src/js/field/remaining_days/remaining_days_field.xml",
        ]
    },
    "external_dependencies": {
        "python": [
            "jdatetime",
            "persiantools",
        ]
    },
}
