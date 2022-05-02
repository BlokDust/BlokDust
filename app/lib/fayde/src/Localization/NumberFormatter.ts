/// <reference path="Format.ts" />

module Fayde.Localization {
    RegisterFormattable(Number, (obj: any, format: string, provider?: any): string => {
        if (obj == null)
            return null;
        if (obj.constructor !== Number)
            return null;
        var res = tryStandardFormat(<number>obj, format);
        if (res != undefined)
            return res;
        return format;
    });

    // Standard Formats
    // C or c       Currency
    // D or d       Decimal
    // E or e       Exponential
    // F or f       Fixed-point
    // G or g       General
    // N or n       Number
    // P or p       Percent
    // X or x       Hexadecimal

    function tryStandardFormat(obj: number, format: string): string {
        var ch = format[0];
        if (!ch)
            return undefined;
        var lowerch = ch.toLowerCase();
        if (lowerch < "a" || lowerch > "z")
            return undefined;
        var prec: number = null;
        if (format.length > 1) {
            var prec = parseInt(format.substr(1));
            if (isNaN(prec))
                return undefined;
        }
        
        var f = standardFormatters[ch] || standardFormatters[lowerch];
        if (!f)
            return undefined;
        return f(obj, prec);
    }
    interface IStandardFormatter {
        (obj: number, precision: number): string;
    }
    var standardFormatters: IStandardFormatter[] = [];
    standardFormatters["c"] = function (obj: number, precision: number): string {
        return NumberFormatInfo.Instance.FormatCurrency(obj, precision);
    };
    standardFormatters["d"] = function (obj: number, precision: number): string {
        return NumberFormatInfo.Instance.FormatDecimal(obj, precision);
    };
    standardFormatters["E"] = function (obj: number, precision: number): string {
        return NumberFormatInfo.Instance.FormatExponential(obj, precision).toUpperCase();
    };
    standardFormatters["e"] = function (obj: number, precision: number): string {
        return NumberFormatInfo.Instance.FormatExponential(obj, precision);
    };
    standardFormatters["f"] = function (obj: number, precision: number): string {
        return NumberFormatInfo.Instance.FormatNumber(obj, precision, true);
    };
    standardFormatters["g"] = function (obj: number, precision: number): string {
        return NumberFormatInfo.Instance.FormatGeneral(obj, precision);
    };
    standardFormatters["n"] = function (obj: number, precision: number): string {
        return NumberFormatInfo.Instance.FormatNumber(obj, precision);
    };
    standardFormatters["p"] = function (obj: number, precision: number): string {
        return NumberFormatInfo.Instance.FormatPercent(obj, precision);
    };
    standardFormatters["X"] = function (obj: number, precision: number): string {
        return NumberFormatInfo.Instance.FormatHexadecimal(obj, precision).toUpperCase();
    };
    standardFormatters["x"] = function (obj: number, precision: number): string {
        return NumberFormatInfo.Instance.FormatHexadecimal(obj, precision);
    };
}