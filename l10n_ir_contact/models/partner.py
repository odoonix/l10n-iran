from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


class Partner(models.Model):
    _inherit = 'res.partner'
    _sql_constraints = [
        (
            'meli_uniq',
            'unique(id_code)',
            "A person or a company with the same code already exists."
        ),
    ]

    id_code = fields.Char(
        size=16,
        trim=True,
        translate=False)

    parent_id = fields.Many2one(
        comodel_name='res.partner',
        string='Parent')

    @api.constrains('id_code')
    def validate_meli_code(self):
        for record in self:
            if record.id_code and (len(record.id_code) <= 9 or len(record.id_code) >= 12):
                raise ValidationError(
                    _("Please set a value with lenght properly for meli code."))

            if (record.id_code and (not record.id_code.isdigit())):
                raise ValidationError(_("The Phone Number must be a sequence of digits."))
