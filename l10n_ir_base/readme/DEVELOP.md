This module works by overriding (extending) the standard ir.qweb.field classes.
The number conversion logic utilizes the persiantools library.

To use the conversion function in your own Python code:

```python

    from persiantools import digits

    fa_number = digits.en_to_fa(12345)
```
