module nullstone {
    export interface IInterfaceDeclaration<T> {
        name: string;
        is(o: any): boolean;
        as(o: any): T;
        mark(type: any): IInterfaceDeclaration<T>;
    }
    export class Interface<T> implements IInterfaceDeclaration<T> {
        name: string;

        constructor (name: string) {
            Object.defineProperty(this, "name", {value: name, writable: false});
        }

        is (o: any): boolean {
            if (!o)
                return false;
            var type = o.constructor;
            while (type) {
                var is: IInterfaceDeclaration<any>[] = type.$$interfaces;
                if (is && is.indexOf(this) > -1)
                    return true;
                type = getTypeParent(type);
            }
            return false;
        }

        as (o: any): T {
            if (!this.is(o))
                return undefined;
            return <T>o;
        }

        mark (type: any): Interface<T> {
            addTypeInterfaces(type, this);
            return this;
        }
    }
}