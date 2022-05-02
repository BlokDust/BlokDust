class Color implements ICloneable {
    private static __NoAlphaRegex = /#([0-9a-fA-F][0-9a-fA-F]){1}([0-9a-fA-F][0-9a-fA-F]){1}([0-9a-fA-F][0-9a-fA-F]){1}/;
    private static __AlphaRegex = /#([0-9a-fA-F][0-9a-fA-F]){1}([0-9a-fA-F][0-9a-fA-F]){1}([0-9a-fA-F][0-9a-fA-F]){1}([0-9a-fA-F][0-9a-fA-F]){1}/;

    R: number = 0;
    G: number = 0;
    B: number = 0;
    A: number = 1.0;

    Add(color2: Color) {
        var c = new Color();
        c.R = this.R + color2.R;
        c.G = this.G + color2.G;
        c.B = this.B + color2.B;
        c.A = this.A + color2.A;
        return c;
    }
    Subtract(color2: Color) {
        var c = new Color();
        c.R = this.R - color2.R;
        c.G = this.G - color2.G;
        c.B = this.B - color2.B;
        c.A = this.A - color2.A;
        return c;
    }
    Multiply(factor: number) {
        var c = new Color();
        c.R = this.R * factor;
        c.G = this.G * factor;
        c.B = this.B * factor;
        c.A = this.A * factor;
        return c;
    }
    Equals(other: Color) {
        return this.R === other.R
            && this.G === other.G
            && this.B === other.B
            && this.A === other.A;
    }
    toString() {
        var r = Math.round(this.R) || 0;
        var g = Math.round(this.G) || 0;
        var b = Math.round(this.B) || 0;
        var a = this.A || 0;
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    ToHexStringNoAlpha(): string {
        return "#" + this.R.toString(16) + this.G.toString(16) + this.B.toString(16);
    }

    Clone(): Color {
        return Color.FromRgba(this.R, this.G, this.B, this.A);
    }

    static LERP(start: Color, end: Color, p: number): Color {
        var c = new Color();
        c.R = start.R + (end.R - start.R) * p;
        c.G = start.G + (end.G - start.G) * p;
        c.B = start.B + (end.B - start.B) * p;
        c.A = start.A + (end.A - start.A) * p;
        return c;
    }
    static FromRgba(r: number, g: number, b: number, a: number): Color {
        var c = new Color();
        c.R = r;
        c.G = g;
        c.B = b;
        c.A = a;
        return c;
    }
    static FromHex(hex: string): Color {
        var match;
        var c = new Color();
        if ((match = Color.__AlphaRegex.exec(hex)) != null) {
            c.A = parseInt(match[1], 16) / 255.0;
            c.R = parseInt(match[2], 16);
            c.G = parseInt(match[3], 16);
            c.B = parseInt(match[4], 16);
        } else if ((match = Color.__NoAlphaRegex.exec(hex)) != null) {
            c.A = 1.0;
            c.R = parseInt(match[1], 16);
            c.G = parseInt(match[2], 16);
            c.B = parseInt(match[3], 16);
        }
        return c;
    }

    static KnownColors = {
        AliceBlue: Color.FromHex("#FFF0F8FF"),
        AntiqueWhite: Color.FromHex("#FFFAEBD7"),
        Aqua: Color.FromHex("#FF00FFFF"),
        Aquamarine: Color.FromHex("#FF7FFFD4"),
        Azure: Color.FromHex("#FFF0FFFF"),
        Beige: Color.FromHex("#FFF5F5DC"),
        Bisque: Color.FromHex("#FFFFE4C4"),
        Black: Color.FromHex("#FF000000"),
        BlanchedAlmond: Color.FromHex("#FFFFEBCD"),
        Blue: Color.FromHex("#FF0000FF"),
        BlueViolet: Color.FromHex("#FF8A2BE2"),
        Brown: Color.FromHex("#FFA52A2A"),
        BurlyWood: Color.FromHex("#FFDEB887"),
        CadetBlue: Color.FromHex("#FF5F9EA0"),
        Chartreuse: Color.FromHex("#FF7FFF00"),
        Chocolate: Color.FromHex("#FFD2691E"),
        Coral: Color.FromHex("#FFFF7F50"),
        CornflowerBlue: Color.FromHex("#FF6495ED"),
        Cornsilk: Color.FromHex("#FFFFF8DC"),
        Crimson: Color.FromHex("#FFDC143C"),
        Cyan: Color.FromHex("#FF00FFFF"),
        DarkBlue: Color.FromHex("#FF00008B"),
        DarkCyan: Color.FromHex("#FF008B8B"),
        DarkGoldenrod: Color.FromHex("#FFB8860B"),
        DarkGray: Color.FromHex("#FFA9A9A9"),
        DarkGreen: Color.FromHex("#FF006400"),
        DarkKhaki: Color.FromHex("#FFBDB76B"),
        DarkMagenta: Color.FromHex("#FF8B008B"),
        DarkOliveGreen: Color.FromHex("#FF556B2F"),
        DarkOrange: Color.FromHex("#FFFF8C00"),
        DarkOrchid: Color.FromHex("#FF9932CC"),
        DarkRed: Color.FromHex("#FF8B0000"),
        DarkSalmon: Color.FromHex("#FFE9967A"),
        DarkSeaGreen: Color.FromHex("#FF8FBC8F"),
        DarkSlateBlue: Color.FromHex("#FF483D8B"),
        DarkSlateGray: Color.FromHex("#FF2F4F4F"),
        DarkTurquoise: Color.FromHex("#FF00CED1"),
        DarkViolet: Color.FromHex("#FF9400D3"),
        DeepPink: Color.FromHex("#FFFF1493"),
        DeepSkyBlue: Color.FromHex("#FF00BFFF"),
        DimGray: Color.FromHex("#FF696969"),
        DodgerBlue: Color.FromHex("#FF1E90FF"),
        Firebrick: Color.FromHex("#FFB22222"),
        FloralWhite: Color.FromHex("#FFFFFAF0"),
        ForestGreen: Color.FromHex("#FF228B22"),
        Fuchsia: Color.FromHex("#FFFF00FF"),
        Gainsboro: Color.FromHex("#FFDCDCDC"),
        GhostWhite: Color.FromHex("#FFF8F8FF"),
        Gold: Color.FromHex("#FFFFD700"),
        Goldenrod: Color.FromHex("#FFDAA520"),
        Gray: Color.FromHex("#FF808080"),
        Green: Color.FromHex("#FF008000"),
        GreenYellow: Color.FromHex("#FFADFF2F"),
        Honeydew: Color.FromHex("#FFF0FFF0"),
        HotPink: Color.FromHex("#FFFF69B4"),
        IndianRed: Color.FromHex("#FFCD5C5C"),
        Indigo: Color.FromHex("#FF4B0082"),
        Ivory: Color.FromHex("#FFFFFFF0"),
        Khaki: Color.FromHex("#FFF0E68C"),
        Lavender: Color.FromHex("#FFE6E6FA"),
        LavenderBlush: Color.FromHex("#FFFFF0F5"),
        LawnGreen: Color.FromHex("#FF7CFC00"),
        LemonChiffon: Color.FromHex("#FFFFFACD"),
        LightBlue: Color.FromHex("#FFADD8E6"),
        LightCoral: Color.FromHex("#FFF08080"),
        LightCyan: Color.FromHex("#FFE0FFFF"),
        LightGoldenrodYellow: Color.FromHex("#FFFAFAD2"),
        LightGray: Color.FromHex("#FFD3D3D3"),
        LightGreen: Color.FromHex("#FF90EE90"),
        LightPink: Color.FromHex("#FFFFB6C1"),
        LightSalmon: Color.FromHex("#FFFFA07A"),
        LightSeaGreen: Color.FromHex("#FF20B2AA"),
        LightSkyBlue: Color.FromHex("#FF87CEFA"),
        LightSlateGray: Color.FromHex("#FF778899"),
        LightSteelBlue: Color.FromHex("#FFB0C4DE"),
        LightYellow: Color.FromHex("#FFFFFFE0"),
        Lime: Color.FromHex("#FF00FF00"),
        LimeGreen: Color.FromHex("#FF32CD32"),
        Linen: Color.FromHex("#FFFAF0E6"),
        Magenta: Color.FromHex("#FFFF00FF"),
        Maroon: Color.FromHex("#FF800000"),
        MediumAquamarine: Color.FromHex("#FF66CDAA"),
        MediumBlue: Color.FromHex("#FF0000CD"),
        MediumOrchid: Color.FromHex("#FFBA55D3"),
        MediumPurple: Color.FromHex("#FF9370DB"),
        MediumSeaGreen: Color.FromHex("#FF3CB371"),
        MediumSlateBlue: Color.FromHex("#FF7B68EE"),
        MediumSpringGreen: Color.FromHex("#FF00FA9A"),
        MediumTurquoise: Color.FromHex("#FF48D1CC"),
        MediumVioletRed: Color.FromHex("#FFC71585"),
        MidnightBlue: Color.FromHex("#FF191970"),
        MintCream: Color.FromHex("#FFF5FFFA"),
        MistyRose: Color.FromHex("#FFFFE4E1"),
        Moccasin: Color.FromHex("#FFFFE4B5"),
        NavajoWhite: Color.FromHex("#FFFFDEAD"),
        Navy: Color.FromHex("#FF000080"),
        OldLace: Color.FromHex("#FFFDF5E6"),
        Olive: Color.FromHex("#FF808000"),
        OliveDrab: Color.FromHex("#FF6B8E23"),
        Orange: Color.FromHex("#FFFFA500"),
        OrangeRed: Color.FromHex("#FFFF4500"),
        Orchid: Color.FromHex("#FFDA70D6"),
        PaleGoldenrod: Color.FromHex("#FFEEE8AA"),
        PaleGreen: Color.FromHex("#FF98FB98"),
        PaleTurquoise: Color.FromHex("#FFAFEEEE"),
        PaleVioletRed: Color.FromHex("#FFDB7093"),
        PapayaWhip: Color.FromHex("#FFFFEFD5"),
        PeachPuff: Color.FromHex("#FFFFDAB9"),
        Peru: Color.FromHex("#FFCD853F"),
        Pink: Color.FromHex("#FFFFC0CB"),
        Plum: Color.FromHex("#FFDDA0DD"),
        PowderBlue: Color.FromHex("#FFB0E0E6"),
        Purple: Color.FromHex("#FF800080"),
        Red: Color.FromHex("#FFFF0000"),
        RosyBrown: Color.FromHex("#FFBC8F8F"),
        RoyalBlue: Color.FromHex("#FF4169E1"),
        SaddleBrown: Color.FromHex("#FF8B4513"),
        Salmon: Color.FromHex("#FFFA8072"),
        SandyBrown: Color.FromHex("#FFF4A460"),
        SeaGreen: Color.FromHex("#FF2E8B57"),
        SeaShell: Color.FromHex("#FFFFF5EE"),
        Sienna: Color.FromHex("#FFA0522D"),
        Silver: Color.FromHex("#FFC0C0C0"),
        SkyBlue: Color.FromHex("#FF87CEEB"),
        SlateBlue: Color.FromHex("#FF6A5ACD"),
        SlateGray: Color.FromHex("#FF708090"),
        Snow: Color.FromHex("#FFFFFAFA"),
        SpringGreen: Color.FromHex("#FF00FF7F"),
        SteelBlue: Color.FromHex("#FF4682B4"),
        Tan: Color.FromHex("#FFD2B48C"),
        Teal: Color.FromHex("#FF008080"),
        Thistle: Color.FromHex("#FFD8BFD8"),
        Tomato: Color.FromHex("#FFFF6347"),
        Transparent: Color.FromHex("#00FFFFFF"),
        Turquoise: Color.FromHex("#FF40E0D0"),
        Violet: Color.FromHex("#FFEE82EE"),
        Wheat: Color.FromHex("#FFF5DEB3"),
        White: Color.FromHex("#FFFFFFFF"),
        WhiteSmoke: Color.FromHex("#FFF5F5F5"),
        Yellow: Color.FromHex("#FFFFFF00"),
        YellowGreen: Color.FromHex("#FF9ACD32")
    }
}
Fayde.CoreLibrary.addPrimitive(Color);

nullstone.registerTypeConverter(Color, (val: any): Color => {
    if (!val)
        return undefined;
    if (val instanceof Color)
        return <Color>val;
    val = val.toString();
    if (val[0] !== "#") {
        var color = Color.KnownColors[val];
        if (!color)
            throw new NotSupportedException("Unknown Color: " + val);
        return color;
    }
    return Color.FromHex(val);
});