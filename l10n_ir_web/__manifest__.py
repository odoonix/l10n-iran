{
    'name': 'Web Iran Localization',
    "version": "18.0.1.0.0",
    "author": "Moonsun PTY LTD",
    "website": "https://github.com/moonsun/l10n-iran",
    'category': 'Tools',
    'summary': 'Web Iran Localization with Jalali calendar support for date picker',
    'depends': [
        'l10n_ir_base',
        'web'
    ],
    'data': [],
    'assets': {
        'web.assets_backend': [
            "l10n_ir_web/static/src/**/*",
        ],
    },
    'installable': True,
    'application': False,
}