module nullstone {
    export interface IEnumerable<T> {
        getEnumerator(isReverse?: boolean): IEnumerator<T>;
    }
    export interface IEnumerableDeclaration<T> extends IInterfaceDeclaration<T> {
        empty: IEnumerable<T>;
        fromArray(arr: T[]): IEnumerable<T>;
        toArray(en: IEnumerable<T>): T[];
    }
    export var IEnumerable_ = <IEnumerableDeclaration<any>>new Interface("IEnumerable");
    IEnumerable_.is = (o: any): boolean => {
        return o && o.getEnumerator && typeof o.getEnumerator === "function";
    };

    IEnumerable_.empty = {
        getEnumerator: function<T>(isReverse?: boolean): IEnumerator<T> {
            return IEnumerator_.empty;
        }
    };

    IEnumerable_.fromArray = function<T>(arr: T[]): IEnumerable<T> {
        return <IEnumerable<T>>{
            $$arr: arr,
            getEnumerator (isReverse?: boolean): IEnumerator<T> {
                return IEnumerator_.fromArray(this.$$arr, isReverse);
            }
        };
    };

    IEnumerable_.toArray = function<T>(en: IEnumerable<T>): T[] {
        var a: T[] = [];
        for (var e = en.getEnumerator(); e.moveNext();) {
            a.push(e.current);
        }
        return a;
    }
}