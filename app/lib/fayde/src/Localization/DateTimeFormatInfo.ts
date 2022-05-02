/// <reference path="Calendar.ts" />

module Fayde.Localization {
    export enum CalendarWeekRule {
        FirstDay,
        FirstFullWeek,
        FirstFourDayWeek,
    }
    export class DateTimeFormatInfo {
        AbbreviatedDayNames: string[] = [
            "Sun",
            "Mon",
            "Tue",
            "Wed",
            "Thu",
            "Fri",
            "Sat"
        ];
        AbbreviatedMonthGenitiveNames: string[] = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
            ""
        ];
        AbbreviatedMonthNames: string[] = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec"
        ];
        AMDesignator: string = "AM";
        Calendar = new Calendar();
        CalendarWeekRule: CalendarWeekRule = CalendarWeekRule.FirstDay;
        DateSeparator: string = "/";
        DayNames: string[] = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday"
        ];
        FirstDayOfWeek: DayOfWeek = DayOfWeek.Sunday;
        FullDateTimePattern: string = "dddd, MMMM dd, yyyy h:mm:ss tt";
        LongDatePattern: string = "dddd, MMMM dd, yyyy";
        LongTimePattern: string = "h:mm:ss tt";
        MonthDayPattern: string = "MMMM dd";
        MonthGenitiveNames: string[] = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
            ""
        ];
        MonthNames: string[] = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"
        ];
        PMDesignator: string = "PM";
        RFC1123Pattern: string = "ddd, dd MMM yyyy HH':'mm':'ss 'GMT'";
        ShortDatePattern: string = "M/d/yyyy";
        ShortestDayNames: string[] = [
            "Su",
            "Mo",
            "Tu",
            "We",
            "Th",
            "Fr",
            "Sa"
        ];
        ShortTimePattern: string = "h:mm tt";
        SortableDateTimePattern: string = "yyyy'-'MM'-'dd'T'HH':'mm':'ss";
        TimeSeparator: string = ":";
        UniversalSortableDateTimePattern: string = "yyyy'-'MM'-'dd HH':'mm':'ss'Z'";
        YearMonthPattern: string = "MMMM, yyyy";

        HasForceTwoDigitYears: boolean = false;

        GetEraName(era: number): string {
            if (era === 0)
                era = this.Calendar.CurrentEraValue;
            if (era < 0)
                throw new ArgumentException("era");
            var eras = this.Calendar.EraNames;
            if (era >= eras.length)
                throw new ArgumentException("era");
            return eras[era];
        }

        static Instance = new DateTimeFormatInfo();

        static ParseRepeatPattern(format: string, pos: number, patternChar: string): number {
            var length = format.length;
            var index = pos + 1;
            var code = patternChar.charCodeAt(0);
            while (index < length && format.charCodeAt(index) === code)
                ++index;
            return index - pos;
        }
        static ParseNextChar(format: string, pos: number): number {
            if (pos >= format.length - 1)
                return -1;
            return format.charCodeAt(pos + 1);
        }
        static ParseQuoteString(format: string, pos: number, result: string[]): number {
            var length = format.length;
            var num = pos;
            var ch1 = format[pos++];
            var flag = false;
            var special = String.fromCharCode(92);
            while (pos < length) {
                var ch2 = format[pos++];
                if (ch2 === ch1) {
                    flag = true;
                    break;
                } else if (ch2 === special) {
                    if (pos >= length)
                        throw new FormatException("Invalid format string.");
                    result.push(format[pos++]);
                } else
                    result.push(ch2);
            }
            if (flag)
                return pos - num;
            throw new FormatException("Bad quote: " + ch1);
        }
        static FormatDigits(sb: string[], value: number, len: number, overrideLenLimit?: boolean) {
            if (!overrideLenLimit && len > 2)
                len = 2;

            var s = Math.floor(value).toString();
            while (s.length < len)
                s = "0" + s;
            sb.push(s);
        }
        static FormatMonth(month: number, repeat: number, info: DateTimeFormatInfo): string {
            if (repeat === 3)
                return info.AbbreviatedMonthNames[month - 1];
            return info.MonthNames[month - 1];
        }
        static FormatDayOfWeek(dayOfWeek: DayOfWeek, repeat: number, info: DateTimeFormatInfo): string {
            if (repeat === 3)
                return info.AbbreviatedDayNames[dayOfWeek];
            return info.DayNames[dayOfWeek];
        }

        static HebrewFormatDigits(sb: string[], digits: number) {
            //TODO:
            console.warn("Hebrew not implemented");
            return digits.toString();
        }
        static FormatHebrewMonthName(obj: DateTime, month: number, repeat: number, info: DateTimeFormatInfo): string {
            console.warn("Hebrew not implemented");
            return DateTimeFormatInfo.FormatMonth(month, repeat, info);
        /*
            if (info.Calendar.IsLeapYear(info.Calendar.GetYear(obj)))
                return info.internalGetMonthName(month, MonthNameStyles.LeapYear, repeat === 3);
                */
            if (month >= 7)
                ++month;
            if (repeat === 3)
                return info.AbbreviatedMonthNames[month-1];
            return info.MonthNames[month-1];
        }
    }
}