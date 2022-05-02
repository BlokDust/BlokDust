/// <reference path="../Primitives/DateTime.ts" />
/// <reference path="Format.ts" />

module Fayde.Localization {
    RegisterFormattable(DateTime, (obj: any, format: string, provider?: any): string => {
        if (!format)
            return undefined;
        if (obj == null)
            return null;
        if (obj.constructor !== DateTime)
            return null;
        var res = tryStandardFormat(<DateTime>obj, format);
        if (res != undefined)
            return res;
        return tryCustomFormat(<DateTime>obj, format, TimeSpan.MinValue);
    });

    // Standard Formats
    // d        Short date
    // D        Long date
    // f        Full date/time (short time)
    // F        Full date/time (long time)
    // g        General date/time (short time)
    // G        General date/time (long time)
    // M, m     Month/day
    // R, r     RFC1123
    // s        Sortable date/time
    // t        Short time
    // T        Long time
    // u        Universal sortable date/time
    // U        Universal full date/time
    // Y, y     Year month

    function tryStandardFormat(obj: DateTime, format: string): string {
        if (format.length !== 1)
            return undefined;
        var ch = format[0];
        if (!ch)
            return undefined;
        var f = standardFormatters[ch];
        if (!f)
            return undefined;
        return f(obj);
    }
    interface IStandardFormatter {
        (obj: DateTime): string;
    }
    var standardFormatters: IStandardFormatter[] = [];
    standardFormatters["d"] = function (obj: DateTime): string {
        return [
            obj.Month.toString(),
            obj.Day.toString(),
            obj.Year.toString()
        ].join("/");
    };
    standardFormatters["D"] = function (obj: DateTime): string {
        var info = DateTimeFormatInfo.Instance;
        return [
            info.DayNames[obj.DayOfWeek],
            ", ",
            info.MonthNames[obj.Month - 1],
            " ",
            obj.Day.toString(),
            ", ",
            obj.Year.toString()
        ].join("");
    };
    standardFormatters["f"] = function (obj: DateTime): string {
        return [
            standardFormatters["D"](obj),
            standardFormatters["t"](obj)
        ].join(" ");
    };
    standardFormatters["F"] = function (obj: DateTime): string {
        return [
            standardFormatters["D"](obj),
            standardFormatters["T"](obj)
        ].join(" ");
    };
    standardFormatters["g"] = function (obj: DateTime): string {
        return [
            standardFormatters["d"](obj),
            standardFormatters["t"](obj)
        ].join(" ");
    };
    standardFormatters["G"] = function (obj: DateTime): string {
        return [
            standardFormatters["d"](obj),
            standardFormatters["T"](obj)
        ].join(" ");
    };
    standardFormatters["m"] = standardFormatters["M"] = function (obj: DateTime): string {
        var info = DateTimeFormatInfo.Instance;
        return [
            info.MonthNames[obj.Month - 1],
            obj.Day
        ].join(" ");
    };
    standardFormatters["r"] = standardFormatters["R"] = function (obj: DateTime): string {
        var utc = obj.ToUniversalTime();
        var info = DateTimeFormatInfo.Instance;
        return [
            info.AbbreviatedDayNames[utc.DayOfWeek],
            ", ",
            utc.Day,
            " ",
            info.AbbreviatedMonthNames[utc.Month-1],
            " ",
            utc.Year,
            " ",
            utc.Hour,
            ":",
            utc.Minute,
            ":",
            utc.Second,
            " GMT"
        ].join("");
    };
    standardFormatters["s"] = function (obj: DateTime): string {
        return [
            obj.Year,
            "-",
            padded(obj.Month),
            "-",
            padded(obj.Day),
            "T",
            padded(obj.Hour),
            ":",
            padded(obj.Minute),
            ":",
            padded(obj.Second)

        ].join("");
    };
    standardFormatters["t"] = function (obj: DateTime): string {
        var info = DateTimeFormatInfo.Instance;
        var hour = obj.Hour;
        var desig = info.AMDesignator;
        if (hour > 12) {
            hour -= 12;
            desig = info.PMDesignator;
        }
        return [
            hour.toString(),
            ":",
            obj.Minute.toString(),
            " ",
            desig
        ].join("");
    };
    standardFormatters["T"] = function (obj: DateTime): string {
        var info = DateTimeFormatInfo.Instance;
        var hour = obj.Hour;
        var desig = info.AMDesignator;
        if (hour > 12) {
            hour -= 12;
            desig = info.PMDesignator;
        }
        return [
            hour.toString(),
            ":",
            obj.Minute.toString(),
            ":",
            obj.Second.toString(),
            " ",
            desig
        ].join("");
    };
    standardFormatters["u"] = function (obj: DateTime): string {
        return [
            obj.Year.toString(),
            "-",
            padded(obj.Month),
            "-",
            padded(obj.Day),
            " ",
            padded(obj.Hour),
            ":",
            padded(obj.Minute),
            ":",
            padded(obj.Second),
            "Z"
        ].join("");
    };
    standardFormatters["U"] = function (obj: DateTime): string {
        var info = DateTimeFormatInfo.Instance;
        var hour = obj.Hour;
        var desig = info.AMDesignator;
        if (hour > 12) {
            hour -= 12;
            desig = info.PMDesignator;
        }
        return [
            info.DayNames[obj.DayOfWeek],
            ", ",
            info.MonthNames[obj.Month-1],
            " ",
            obj.Day.toString(),
            ", ",
            obj.Year.toString(),
            " ",
            hour.toString(),
            ":",
            obj.Minute.toString(),
            ":",
            obj.Second.toString(),
            " ",
            desig
        ].join("");
    };
    standardFormatters["y"] = standardFormatters["Y"] = function (obj: DateTime): string {
        var info = DateTimeFormatInfo.Instance;
        return [
            info.MonthNames[obj.Month - 1],
            obj.Year
        ].join(", ");
    };

    function padded(num: number): string {
        return num < 10 ? "0" + num.toString() : num.toString();
    }

    function tryCustomFormat(obj: DateTime, format: string, offset: TimeSpan): string {
        var info = DateTimeFormatInfo.Instance;
        var calendar = info.Calendar;
        var stringBuilder: string[] = [];
        var flag = calendar.ID === 8;
        var timeOnly = true;
        var index = 0;
        var len: number;
        while (index < format.length) {
            var patternChar = format[index];
            switch (patternChar) {
                case 'm':
                    len = DateTimeFormatInfo.ParseRepeatPattern(format, index, patternChar);
                    DateTimeFormatInfo.FormatDigits(stringBuilder, obj.Minute, len);
                    break;
                case 's':
                    len = DateTimeFormatInfo.ParseRepeatPattern(format, index, patternChar);
                    DateTimeFormatInfo.FormatDigits(stringBuilder, obj.Second, len);
                    break;
                case 't':
                    len = DateTimeFormatInfo.ParseRepeatPattern(format, index, patternChar);
                    if (len === 1) {
                        if (obj.Hour < 12) {
                            if (info.AMDesignator.length >= 1) {
                                stringBuilder.push(info.AMDesignator[0]);
                                break;
                            } else
                                break;
                        } else if (info.PMDesignator.length >= 1) {
                            stringBuilder.push(info.PMDesignator[0]);
                            break;
                        } else
                            break;
                    } else {
                        stringBuilder.push(obj.Hour < 12 ? info.AMDesignator : info.PMDesignator);
                        break;
                    }
                case 'y':
                    var year = obj.Year;
                    len = DateTimeFormatInfo.ParseRepeatPattern(format, index, patternChar);
                    if (info.HasForceTwoDigitYears)
                        DateTimeFormatInfo.FormatDigits(stringBuilder, year, len <= 2 ? len : 2);
                    else if (calendar.ID === 8)
                        DateTimeFormatInfo.HebrewFormatDigits(stringBuilder, year);
                    else if (len <= 2) {
                        DateTimeFormatInfo.FormatDigits(stringBuilder, year % 100, len);
                    } else {
                        stringBuilder.push(FormatSingle(year, "D" + len.toString()));
                    }
                    timeOnly = false;
                    break;
                case 'z':
                    len = DateTimeFormatInfo.ParseRepeatPattern(format, index, patternChar);
                    //DateTimeFormatInfo.FormatCustomizedTimeZone(obj, offset, format, len, timeOnly, stringBuilder);
                    console.warn("DateTime 'z' not implemented");
                    break;
                case 'K':
                    len = 1;
                    //DateTimeFormatInfo.FormatCustomizedRoundripTimeZone(obj, offset, stringBuilder);
                    console.warn("DateTime 'K' not implemented");
                    break;
                case 'M':
                    len = DateTimeFormatInfo.ParseRepeatPattern(format, index, patternChar);
                    var month = obj.Month;
                    if (len <= 2) {
                        if (flag)
                            DateTimeFormatInfo.HebrewFormatDigits(stringBuilder, month);
                        else
                            DateTimeFormatInfo.FormatDigits(stringBuilder, month, len);
                    }
                    else if (flag)
                        stringBuilder.push(DateTimeFormatInfo.FormatHebrewMonthName(obj, month, len, info));
                    /*else if ((info.FormatFlags & DateTimeFormatFlags.UseGenitiveMonth) !== DateTimeFormatFlags.None && len >= 4)
                        stringBuilder.push(info.internalGetMonthName(month, DateTimeFormat.IsUseGenitiveForm(format, index, len, 'd') ? MonthNameStyles.Genitive : MonthNameStyles.Regular, false));*/
                    else
                        stringBuilder.push(DateTimeFormatInfo.FormatMonth(month, len, info));
                    timeOnly = false;
                    break;
                case '\\':
                    var num2 = DateTimeFormatInfo.ParseNextChar(format, index);
                    if (num2 < 0)
                        throw formatError();
                    stringBuilder.push(String.fromCharCode(num2));
                    len = 2;
                    break;
                case 'd':
                    len = DateTimeFormatInfo.ParseRepeatPattern(format, index, patternChar);
                    if (len <= 2) {
                        var dayOfMonth = obj.Day;
                        if (flag)
                            DateTimeFormatInfo.HebrewFormatDigits(stringBuilder, dayOfMonth);
                        else
                            DateTimeFormatInfo.FormatDigits(stringBuilder, dayOfMonth, len);
                    } else {
                        var dayOfWeek = obj.DayOfWeek;
                        stringBuilder.push(DateTimeFormatInfo.FormatDayOfWeek(dayOfWeek, len, info));
                    }
                    timeOnly = false;
                    break;
                case 'f':
                    len = DateTimeFormatInfo.ParseRepeatPattern(format, index, patternChar);
                    if (len > 7)
                        throw formatError();
                    stringBuilder.push(msf(obj.Millisecond, len));
                    break;
                case 'F':
                    len = DateTimeFormatInfo.ParseRepeatPattern(format, index, patternChar);
                    if (len > 7)
                        throw formatError();
                    stringBuilder.push(msF(obj.Millisecond, len));
                    break;
                case 'g':
                    len = DateTimeFormatInfo.ParseRepeatPattern(format, index, patternChar);
                    stringBuilder.push(info.GetEraName(1));
                    break;
                case 'h':
                    len = DateTimeFormatInfo.ParseRepeatPattern(format, index, patternChar);
                    var num5 = obj.Hour % 12;
                    if (num5 === 0)
                        num5 = 12;
                    DateTimeFormatInfo.FormatDigits(stringBuilder, num5, len);
                    break;
                case '/':
                    stringBuilder.push(info.DateSeparator);
                    len = 1;
                    break;
                case ':':
                    stringBuilder.push(info.TimeSeparator);
                    len = 1;
                    break;
                case 'H':
                    len = DateTimeFormatInfo.ParseRepeatPattern(format, index, patternChar);
                    DateTimeFormatInfo.FormatDigits(stringBuilder, obj.Hour, len);
                    break;
                case '"':
                case '\'':
                    len = DateTimeFormatInfo.ParseQuoteString(format, index, stringBuilder);
                    break;
                case '%':
                    var num6 = DateTimeFormatInfo.ParseNextChar(format, index);
                    if (num6 < 0 || num6 === 37)
                        throw formatError();
                    stringBuilder.push(tryCustomFormat(obj, String.fromCharCode(num6), offset));
                    len = 2;
                    break;
                default:
                    stringBuilder.push(patternChar);
                    len = 1;
                    break;
            }
            index += len;
        }
        return stringBuilder.join("");
    }

    function msf(ms: number, len: number): string {
        var s = Math.abs(ms).toString();
        while (s.length < 3)
            s = "0" + s;
        s += "0000";
        return s.substr(0, len);
    }
    function msF(ms: number, len: number): string {
        var f = msf(ms, len);
        var end = f.length - 1;
        for (; end >= 0; end--) {
            if (f[end] !== "0")
                break;
        }
        return f.slice(0, end + 1);
    }
    
    function formatError(): FormatException {
        return new FormatException("Invalid format string.");
    }
}