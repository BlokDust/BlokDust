module nullstone {
    var converters: any = [];
    converters[<any>Boolean] = function (val: any): boolean {
        if (val == null)
            return null;
        if (typeof val === "boolean")
            return val;
        if (typeof val === "number")
            return val !== 0;
        var c = val.toString().toUpperCase();
        return c === "TRUE" ? true : (c === "FALSE" ? false : null);
    };
    converters[<any>String] = function (val: any): String {
        if (val == null) return "";
        return val.toString();
    };
    converters[<any>Number] = function (val: any): Number {
        if (!val) return 0;
        if (typeof val === "number")
            return val;
        if (typeof val === "boolean")
            return val ? 1 : 0;
        return parseFloat(val.toString());
    };
    converters[<any>Date] = function (val: any): Date {
        if (val == null)
            return new Date(0);
        return new Date(val.toString());
    };
    converters[<any>RegExp] = function (val: any): RegExp {
        if (val instanceof RegExp)
            return val;
        if (val = null)
            throw new Error("Cannot specify an empty RegExp.");
        val = val.toString();
        return new RegExp(val);
    };

    export function convertAnyToType (val: any, type: Function): any {
	if (val && val.constructor === type)
	    return val;
        var converter: (val: any) => any = (<any>converters)[<any>type];
        if (converter)
            return converter(val);
        if (type instanceof Enum) {
            var enumo = (<Enum><any>type).Object;
            if (enumo.Converter)
                return enumo.Converter(val);
            val = val || 0;
            if (typeof val === "string")
                return enumo[val];
            return val;
        }
        return val;
    }

    export function convertStringToEnum<T> (val: string, en: any): T {
        if (!val)
            return <T><any>0;
        return <T>en[val];
    }

    export function registerTypeConverter (type: Function, converter: (val: any) => any) {
        converters[<any>type] = converter;
    }

    export function registerEnumConverter (e: any, converter: (val: any) => any) {
        e.Converter = converter;
    }
}
