
module Fayde.Data {
    export interface IPropertyPathParserData {
        typeName: string;
        propertyName: string;
        index: number;
    }

    export enum PropertyNodeType {
        None = 0,
        AttachedProperty = 1,
        Indexed = 2,
        Property = 3,
    }

    /// Property Path Syntax
    /// http://msdn.microsoft.com/en-us/library/cc645024(v=vs.95).aspx
    export class PropertyPathParser {
        Path: string;
        constructor(path: string) {
            this.Path = path;
        }

        Step(data: IPropertyPathParserData): PropertyNodeType {
            var type = PropertyNodeType.None;
            var path = this.Path;
            if (path.length === 0) {
                data.typeName = null;
                data.propertyName = null;
                data.index = null;
                return type;
            }

            var end: number = 0;
            if (path.charAt(0) === '(') {
                type = PropertyNodeType.AttachedProperty;
                end = path.indexOf(')');
                if (end === -1)
                    throw new ArgumentException("Invalid property path. Attached property is missing the closing bracket");

                var tickOpen = path.indexOf('\'');
                var tickClose = 0;
                var typeOpen: number;
                var typeClose: number;
                var propOpen: number;
                var propClose: number;

                typeOpen = path.indexOf('\'');
                if (typeOpen > 0) {
                    typeOpen++;

                    typeClose = path.indexOf('\'', typeOpen + 1);
                    if (typeClose < 0)
                        throw new Exception("Invalid property path, Unclosed type name '" + path + "'.");

                    propOpen = path.indexOf('.', typeClose);
                    if (propOpen < 0)
                        throw new Exception("Invalid properth path, No property indexer found '" + path + "'.");

                    propOpen++;
                } else {
                    typeOpen = 1;
                    typeClose = path.indexOf('.', typeOpen);
                    if (typeClose < 0)
                        throw new Exception("Invalid property path, No property indexer found on '" + path + "'.");
                    propOpen = typeClose + 1;
                }

                propClose = end;

                data.typeName = path.slice(typeOpen, typeClose);
                data.propertyName = path.slice(propOpen, propClose);

                data.index = null;
                if (path.length > (end + 1) && path.charAt(end + 1) === '.')
                    end++;
                path = path.substr(end + 1);
            } else if (path.charAt(0) === '[') {
                type = PropertyNodeType.Indexed;
                end = path.indexOf(']');

                data.typeName = null;
                data.propertyName = null;
                data.index = parseInt(path.substr(1, end - 1));
                path = path.substr(end + 1);
                if (path.charAt(0) === '.')
                    path = path.substr(1);
            } else {
                type = PropertyNodeType.Property;
                end = indexOfAny(path, ['.', '[']);

                if (end === -1) {
                    data.propertyName = path;
                    path = "";
                } else {
                    data.propertyName = path.substr(0, end);
                    if (path.charAt(end) === '.')
                        path = path.substr(end + 1);
                    else
                        path = path.substr(end);
                }

                data.typeName = null;
                data.index = null;
            }
            this.Path = path;

            return type;
        }
    }

    function indexOfAny(str: string, carr: string[], start?: number): number {
        if (!carr)
            return -1;
        if (!start) start = 0;
        for (var cur = start; cur < str.length; cur++) {
            var c = str.charAt(cur);
            for (var i = 0; i < carr.length; i++) {
                if (c === carr[i])
                    return cur;
            }
        }
        return -1;
    }
}