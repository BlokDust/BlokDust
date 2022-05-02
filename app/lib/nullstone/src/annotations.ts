module nullstone {
    interface AnnotatedType extends Function {
        $$annotations: any[][];
    }

    export function Annotation (type: Function, name: string, value: any, forbidMultiple?: boolean) {
        var at = <AnnotatedType>type;
        var anns: any[][] = at.$$annotations;
        if (!anns)
            Object.defineProperty(at, "$$annotations", {value: (anns = []), writable: false});
        var ann: any[] = anns[name];
        if (!ann)
            anns[name] = ann = [];
        if (forbidMultiple && ann.length > 0)
            throw new Error("Only 1 '" + name + "' annotation allowed per type [" + getTypeName(type) + "].");
        ann.push(value);
    }

    export function GetAnnotations (type: Function, name: string): any[] {
        var at = <AnnotatedType>type;
        var anns: any[][] = at.$$annotations;
        if (!anns)
            return undefined;
        return (anns[name] || []).slice(0);
    }

    export interface ITypedAnnotation<T> {
        (type: Function, ...values: T[]);
        Get(type: Function): T[];
    }
    export function CreateTypedAnnotation<T>(name: string): ITypedAnnotation<T> {
        function ta (type: Function, ...values: T[]) {
            for (var i = 0, len = values.length; i < len; i++) {
                Annotation(type, name, values[i]);
            }
        }

        (<any>ta).Get = function (type: Function): T[] {
            return GetAnnotations(type, name);
        };
        return <ITypedAnnotation<T>>ta;
    }
}