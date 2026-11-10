"""Regenerate the preloaded Latin face from the licensed, committed Open Sans source.

Requires fonttools[woff]==4.68.0 and brotli==1.2.1. Not needed for site builds.
The original font remains available for characters outside this Latin subset.
"""
from io import BytesIO
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

root = Path(__file__).resolve().parent.parent
font = TTFont(root / 'public/fonts/open-sans-latin.ttf', recalcTimestamp=False)
font = instantiateVariableFont(font, {'wdth': 100}, inplace=False)
# Reload after axis instantiation so subset glyph names and variation keys agree.
intermediate = BytesIO()
font.save(intermediate)
intermediate.seek(0)
font = TTFont(intermediate, recalcTimestamp=False)
options = subset.Options()
options.layout_features = ['*']
options.name_IDs = ['*']
options.name_legacy = True
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=(
    list(range(0x250)) + list(range(0x2000, 0x2070)) + list(range(0x20A0, 0x20D0))
    + [0x2113, 0x2122, 0x2191, 0x2193, 0x2212, 0x2215, 0xFEFF, 0xFFFD]
))
subsetter.subset(font)
font.flavor = 'woff2'
font.save(root / 'src/assets/fonts/open-sans-latin.woff2')
