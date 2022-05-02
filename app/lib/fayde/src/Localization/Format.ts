module Fayde.Localization {
    export function Format(format: string, ...items: any[]): string {
        var sb: string[] = [];
        appendFormat(sb, format, items);
        return sb.join("");
    }
    export function FormatSingle(obj: any, format: string): string {
        return doFormattable(obj, format);
    }

    function appendFormat(_this: string[], format: string, args: any[], provider?: any) {
        if (format == null || args == null)
            throw new ArgumentNullException(format == null ? "format" : "args");
        var index1 = 0;
        var length = format.length;
        var ch = 0;
        while (true) {
            var flag = false;
            var repeatCount = 0;
            var breakout = false;
            do {
                if (index1 < length) {
                    ch = format.charCodeAt(index1);
                    ++index1;
                    if (ch === 125) {
                        if (index1 < length && format.charCodeAt(index1) === 125)
                            ++index1;
                        else
                            throw formatError();
                    }
                    if (ch === 123) {
                        if (index1 >= length || format.charCodeAt(index1) !== 123)
                            --index1;
                        else {
                            breakout = true;
                            ++index1;
                            break;
                        }
                    } else {
                        _this.push(String.fromCharCode(ch));
                        breakout = true;
                        break;
                    }
                }
                if (index1 != length) {
                    var index2 = index1 + 1;
                    if (index2 === length || (ch = format.charCodeAt(index2)) < 48 || ch > 57)
                        throw formatError();
                    var index3 = 0;
                    do {
                        index3 = index3 * 10 + ch - 48;
                        ++index2;
                        if (index2 == length)
                            throw formatError();
                        ch = format.charCodeAt(index2);
                    }
                    while (ch >= 48 && ch <= 57 && index3 < 1000000);
                    if (index3 >= args.length)
                        throw new FormatException("Index out of range.");
                    while (index2 < length && (ch = format.charCodeAt(index2)) === 32)
                        ++index2;
                    flag = false;
                    var num = 0;
                    if (ch === 44) {
                        ++index2;
                        while (index2 < length && format.charCodeAt(index2) === 32)
                            ++index2;
                        if (index2 == length)
                            throw formatError();
                        ch = format.charCodeAt(index2);
                        if (ch === 45) {
                            flag = true;
                            ++index2;
                            if (index2 == length)
                                throw formatError();
                            ch = format.charCodeAt(index2);
                        }
                        if (ch < 48 || ch > 57)
                            throw formatError();
                        do {
                            num = num * 10 + ch - 48;
                            ++index2;
                            if (index2 == length)
                                throw formatError();
                            ch = format.charCodeAt(index2);
                        } while (ch >= 48 && ch <= 57 && num < 1000000);
                    }
                    while (index2 < length && (ch = format.charCodeAt(index2)) === 32)
                        ++index2;
                    var obj = args[index3];
                    var stringBuilder: string[] = null;
                    if (ch === 58) {
                        var index4 = index2 + 1;
                        while (true) {
                            if (index4 === length)
                                throw formatError();
                            ch = format.charCodeAt(index4);
                            ++index4;
                            if (ch === 123) {
                                if (index4 < length && format.charCodeAt(index4) === 123)
                                    ++index4;
                                else
                                    throw formatError();
                            } else if (ch === 125) {
                                if (index4 < length && format.charCodeAt(index4) === 125)
                                    ++index4;
                                else
                                    break;
                            }
                            stringBuilder = stringBuilder || [];
                            stringBuilder.push(String.fromCharCode(ch));
                        }
                        index2 = index4 - 1;
                    }
                    if (ch !== 125)
                        throw formatError();
                    index1 = index2 + 1;
                    var str = formatItem(obj, stringBuilder, provider) || "";
                    repeatCount = num - str.length;
                    if (!flag && repeatCount > 0)
                        pushMany(_this, ' ', repeatCount);
                    _this.push(str);
                }
                else
                    return;
            } while (!flag || repeatCount <= 0);
            if (!breakout)
                pushMany(_this, ' ', repeatCount);
        }
    }
    function formatItem(obj: any, stringBuilder: string[], provider: any): string {
        var format1: string = null;
        var str: string = null;
        /*
        if (customFormatter != null) {
            if (stringBuilder != null)
                format1 = stringBuilderToString(stringBuilder);
            str = customFormatter.Format(format1, obj, provider);
        }
        */
        if (str == null) {
            if (format1 == null && stringBuilder != null)
                format1 = stringBuilderToString(stringBuilder);
            var formatted = format1 == null ? (obj == null ? "" : obj.toString()) : doFormattable(obj, format1, provider);
            if (formatted !== undefined)
                str = formatted;
        }
        return str;
    }
    function pushMany(arr: string[], s: string, count: number) {
        for (var i = count - 1; i >= 0; i--) {
            arr.push(s);
        }
    }
    function formatError(): FormatException {
        return new FormatException("Invalid format string.");
    }
    function stringBuilderToString(arr: string[]): string {
        return arr.join("");
    }

    export interface IFormattable {
        (obj: any, format: string, provider?: any): string;
    }
    var formatters: IFormattable[] = [];
    export function RegisterFormattable(type: Function, formatter: IFormattable) {
        formatters[(<any>type)] = formatter;
    }
    function doFormattable(obj: any, format: string, provider?: any): string {
        if (obj == null)
            return undefined;
        var type = obj.constructor;
        var formatter = formatters[(<number>type)];
        if (!formatter)
            return undefined;
        return formatter(obj, format, provider);
    }
} 