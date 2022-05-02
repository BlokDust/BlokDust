module Fayde.Localization {
    export class NumberFormatInfo {
        CurrencyDecimalDigits: number = 2;
        CurrencyDecimalSeparator: string = ".";
        CurrencyGroupSeparator: string = ",";
        CurrencyGroupSizes: number[] = [3];
        CurrencyNegativePattern: number = 0;
        CurrencyPositivePattern: number = 0;
        CurrencySymbol: string = "$";

        NaNSymbol: string = "NaN";
        NegativeInfinitySymbol: string = "-Infinity";
        PositiveInfinitySymbol: string = "Infinity";
        NegativeSign: string = "-";
        PositiveSign: string = "+";

        NumberDecimalDigits: number = 2;
        NumberDecimalSeparator: string = ".";
        NumberGroupSeparator: string = ",";
        NumberGroupSizes: number[] = [3];
        NumberNegativePattern: number = 1;

        PercentDecimalDigits: number = 2;
        PercentDecimalSeparator: string = ".";
        PercentGroupSeparator: string = ",";
        PercentGroupSizes: number[] = [3];
        PercentNegativePattern: number = 0;
        PercentPositivePattern: number = 0;
        PercentSymbol: string = "%";

        PerMilleSymbol: string = "‰";

        static Instance = new NumberFormatInfo();

        FormatCurrency(num: number, precision: number): string {
            if (precision == null) precision = this.CurrencyDecimalDigits;
            var rawnum = this.FormatRawNumber(Math.abs(num), precision, this.CurrencyDecimalSeparator, this.CurrencyGroupSeparator, this.CurrencyGroupSizes);
            if (num < 0) {
                switch (this.CurrencyNegativePattern) {
                    case 0:
                    default:
                        return "(" + this.CurrencySymbol + rawnum + ")";
                    case 1:
                        return [this.NegativeSign, this.CurrencySymbol, rawnum].join("");
                    case 2:
                        return [this.CurrencySymbol, this.NegativeSign, rawnum].join("");
                    case 3:
                        return [this.CurrencySymbol, rawnum, this.NegativeSign].join("");
                    case 4:
                        return "(" + rawnum + this.CurrencySymbol + ")";
                    case 5:
                        return [this.NegativeSign, rawnum, this.CurrencySymbol].join("");
                    case 6:
                        return [rawnum, this.NegativeSign, this.CurrencySymbol].join("");
                    case 7:
                        return [rawnum, this.CurrencySymbol, this.NegativeSign].join("");
                    case 8:
                        return [this.NegativeSign, rawnum, " ", this.CurrencySymbol].join("");
                    case 9:
                        return [this.NegativeSign, this.CurrencySymbol, " ", rawnum].join("");
                    case 10:
                        return [rawnum, " ", this.CurrencySymbol, this.NegativeSign].join("");
                    case 11:
                        return [this.CurrencySymbol, " ", rawnum, this.NegativeSign].join("");
                    case 12:
                        return [this.CurrencySymbol, " ", this.NegativeSign, rawnum].join("");
                    case 13:
                        return [rawnum, this.NegativeSign, " ", this.CurrencySymbol].join("");
                    case 14:
                        return "(" + this.CurrencySymbol + " " + rawnum + ")";
                    case 15:
                        return "(" + rawnum + " " + this.CurrencySymbol + ")";
                }
            } else {
                switch (this.CurrencyPositivePattern) {
                    case 0:
                    default:
                        return [this.CurrencySymbol, rawnum].join("");
                    case 1:
                        return [rawnum, this.CurrencySymbol].join("");
                    case 2:
                        return [this.CurrencySymbol, rawnum].join(" ");
                    case 3:
                        return [rawnum, this.CurrencySymbol].join(" ");
                }
            }
        }
        FormatNumber(num: number, precision: number, ignoreGroupSep?: boolean): string {
            if (precision == null) precision = this.NumberDecimalDigits;
            var rawnum = this.FormatRawNumber(Math.abs(num), precision, this.NumberDecimalSeparator, ignoreGroupSep ? "" : this.NumberGroupSeparator, this.NumberGroupSizes);
            if (num >= 0)
                return rawnum;
            switch (this.NumberNegativePattern) {
                case 0:
                    return "(" + rawnum + ")";
                case 1:
                default:
                    return [this.NegativeSign, rawnum].join("");
                case 2:
                    return [this.NegativeSign, rawnum].join(" ");
                case 3:
                    return [rawnum, this.NegativeSign].join("");
                case 4:
                    return [rawnum, this.NegativeSign].join(" ");
            }
        }
        FormatPercent(num: number, precision: number): string {
            if (precision == null) precision = this.PercentDecimalDigits;
            var rawnum = this.FormatRawNumber(Math.abs(num * 100), precision, this.PercentDecimalSeparator, this.PercentGroupSeparator, this.PercentGroupSizes);
            var sym = this.PercentSymbol;
            if (num < 0) {
                var sign = this.NegativeSign;
                switch (this.PercentNegativePattern) {
                    case 0:
                    default:
                        return [sign, rawnum, " ", sym].join("");
                    case 1:
                        return [sign, rawnum, sym].join("");
                    case 2:
                        return [sign, sym, rawnum].join("");
                    case 3:
                        return [sym, sign, rawnum].join("");
                    case 4:
                        return [sym, rawnum, sign].join("");
                    case 5:
                        return [rawnum, sign, sym].join("");
                    case 6:
                        return [rawnum, sym, sign].join("");
                    case 7:
                        return [sign, sym, " ", rawnum].join("");
                    case 8:
                        return [sign, sym, " ", rawnum].join("");
                    case 9:
                        return [sym, " ", rawnum, sign].join("");
                    case 10:
                        return [sym, " ", sign, rawnum].join("");
                    case 11:
                        return [rawnum, sign, " ", sym].join("");
                }
            } else {
                switch (this.PercentPositivePattern) {
                    case 0:
                    default:
                        return [rawnum, this.PercentSymbol].join(" ");
                    case 1:
                        return [rawnum, this.PercentSymbol].join("");
                    case 2:
                        return [this.PercentSymbol, rawnum].join("");
                    case 3:
                        return [this.PercentSymbol, rawnum].join(" ");
                }
            }
        }
        FormatGeneral(num: number, precision: number): string {
            if (precision == null) precision = 6;
            var sig = sigDigits(Math.abs(num), precision);
            var rawnum = sig.toString();
            if (num >= 0)
                return rawnum;
            return this.NegativeSign + rawnum;
        }
        FormatDecimal(num: number, precision: number): string {
            var rawnum = this.FormatRawNumber(Math.abs(num), 0, "", "", null);
            var d = padded(rawnum, precision || 0, true);
            if (num < 0)
                d = this.NegativeSign + d;
            return d;
        }
        FormatExponential(num: number, precision: number): string {
            if (precision == null) precision = 6;
            var e = num.toExponential(precision);
            var tokens = e.split("e+");
            return tokens[0] + "e" + this.PositiveSign + padded(tokens[1], 3, true);
        }
        FormatHexadecimal(num: number, precision: number): string {
            if (precision == null) precision = 2;
            num = parseInt(<any>num);
            if (num >= 0)
                return padded(num.toString(16), precision, true);
            var us = (Math.pow(2, 32) + num).toString(16);
            if (precision >= us.length)
                return padded(us, precision, true);
            var start = 0;
            while (us.length - start > precision && us[start] === "f") {
                start++;
            }
            return us.substr(start);
        }
        FormatRawNumber(num: number, precision: number, decSep: string, groupSep: string, groupSizes: number[]): string {
            //Ignoring group sizes for now: using [3]
            var rounded = round(num, precision);
            var ip = Math.floor(rounded).toString();
            var fp = rounded.toString().split('.')[1];
            var pfp = padded(fp, precision);
            if (!pfp)
                return grouped(ip, groupSep);
            return [
                grouped(ip, groupSep),
                pfp
            ].join(decSep);
        }
    }

    function grouped(s: string, sep: string): string {
        if (s.length < 4)
            return s;
        var offset = s.length % 3;
        if (offset !== 0) {
            offset = 3 - offset;
            s = new Array(offset + 1).join("0") + s;
        }
        return s.match(/\d\d\d/g).join(sep).substr(offset);
    }
    function padded(s: string, precision: number, front?: boolean): string {
        if (!s)
            return new Array(precision + 1).join("0");
        if (s.length > precision)
            return front ? s : s.substr(0, precision);
        if (front)
            return new Array(precision - s.length + 1).join("0") + s;
        return s + new Array(precision - s.length + 1).join("0");
    }
    function round(num: number, places: number): number {
        var factor = Math.pow(10, places);
        return Math.round(num * factor) / factor;
    }
    function sigDigits(num: number, digits: number): number {
        var n = num.toString();
        var index = n.indexOf(".");
        if (index > -1)
            return round(num, digits - index);
        return round(num, digits - n.length);
    }

    // Currency Negative Patterns
    // 0      ($n)
    // 1      -$n
    // 2      $-n
    // 3      $n-
    // 4      (n$)
    // 5      -n$
    // 6      n-$
    // 7      n$-
    // 8      -n $
    // 9      -$ n
    // 10      n $-
    // 11      $ n-
    // 12      $ -n
    // 13      n- $
    // 14      ($ n)
    // 15      (n $)
    
    // Currency Positive Patterns
    // 0       $n
    // 1       n$
    // 2       $ n
    // 3       n $

    // Number Negative Patterns
    // 0      (n)
    // 1      -n
    // 2      - n
    // 3      n-
    // 4      n -

    // Percent Negative Patterns
    // 0      -n %
    // 1      -n%
    // 2      -%n
    // 3      %-n
    // 4      %n-
    // 5      n-%
    // 6      n%-
    // 7      -% n
    // 8      n %-
    // 9      % n-
    // 10     % -n
    // 11     n- %

    // Percent Positive Patterns
    // 0       n %
    // 1       n%
    // 2       %n
    // 3       % n
}