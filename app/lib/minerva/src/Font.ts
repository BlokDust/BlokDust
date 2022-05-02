/// <reference path="Enums.ts" />

module minerva {
    export var FontStyle = {
        Normal: "normal",
        Italic: "italic",
        Oblique: "oblique"
    };
    export var FontStretch = {
        UltraCondensed: "ultra-condensed",
        ExtraCondensed: "extra-condensed",
        Condensed: "condensed",
        SemiCondensed: "semi-condensed",
        Normal: "normal",
        SemiExpanded: "semi-expanded",
        Expanded: "expanded",
        ExtraExpanded: "extra-expanded",
        UltraExpanded: "ultra-expanded"
    };

    /// References
    //  Font-face generator: http://www.flaticon.com/font-face
    //  How to use: http://stackoverflow.com/questions/14399484/how-to-render-segoe-ui-font-in-different-navigators-and-oss
    //  Font Share: http://www.cssfontstack.com/

    export class Font {
        static DEFAULT_FAMILY = "Segoe UI, Lucida Grande, Verdana";
        static DEFAULT_STRETCH = FontStretch.Normal;
        static DEFAULT_STYLE = FontStyle.Normal;
        static DEFAULT_WEIGHT = FontWeight.Normal;
        static DEFAULT_SIZE = 14;

        family: string = Font.DEFAULT_FAMILY;
        size: number = Font.DEFAULT_SIZE;
        stretch: string = Font.DEFAULT_STRETCH;
        style: string = Font.DEFAULT_STYLE;
        weight: FontWeight = Font.DEFAULT_WEIGHT;

        private $$cachedObj: string = null;
        private $$cachedHeight: number = null;

        static mergeInto (font: Font, family: string, size: number, stretch: string, style: string, weight: FontWeight): boolean {
            var changed = font.family !== family
                || font.size !== size
                || font.stretch !== stretch
                || font.style !== style
                || font.weight !== weight;
            font.family = family;
            font.size = size;
            font.stretch = stretch;
            font.style = style;
            font.weight = weight;
            if (changed) {
                font.$$cachedObj = null;
                font.$$cachedHeight = null;
            }
            return changed;
        }

        toHtml5Object (): any {
            return this.$$cachedObj = this.$$cachedObj || translateFont(this);
        }

        getHeight (): number {
            if (this.$$cachedHeight == null)
                this.$$cachedHeight = fontHeight.get(this);
            return this.$$cachedHeight;
        }

        getAscender (): number {
            return 0;
        }

        getDescender (): number {
            return 0;
        }
    }

    function translateFont (font: Font): string {
        //Format: font-style font-variant font-weight font-size/line-height font-family
        //Font Styles: normal, italic, oblique
        //Font Variants: normal, small-caps
        //Font Weights: normal, bold, bolder, lighter, 100, 200, 300, 400, 500, 600, 700, 800, 900
        var s = "";
        s += font.style.toString() + " ";
        s += "normal ";
        s += (<number>font.weight).toString() + " ";
        s += font.size + "px ";
        s += font.family.toString();
        return s;
    }
}