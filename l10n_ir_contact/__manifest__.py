{
    "name": "Contact for IR",
    "summary": """
        Short (1 phrase/line) summary of the module's purpose, used as
        subtitle on modules listing or apps.openerp.com""",
    "author": "Viraweb",
    "license": "LGPL-3",
    "website": "https://viraweb123.ir/",
    "category": "Uncategorized",
    "version": "16.0.0.1.0",
    # any module necessary for this one to work correctly
    "depends": ["base"],
    # always loaded
    "data": [
        # 'security/ir.model.access.csv',
        "views/view_contact_ir.xml",
    ],

}
