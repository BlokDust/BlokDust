module nullstone {
    export interface IEnumerator<T> {
        current: T;
        moveNext(): boolean;
    }
    export interface IEnumeratorDeclaration<T> extends IInterfaceDeclaration<T> {
        empty: IEnumerator<T>;
        fromArray(arr: T[], isReverse?: boolean):IEnumerator<T>;
    }
    export var IEnumerator_ = <IEnumeratorDeclaration<any>>new Interface("IEnumerator");

    IEnumerator_.empty = {
        current: undefined,
        moveNext (): boolean {
            return false;
        }
    };

    IEnumerator_.fromArray = function<T> (arr: T[], isReverse?: boolean): IEnumerator<T> {
        var len = arr.length;
        var e = <IEnumerator<T>>{moveNext: undefined, current: undefined};
        var index;
        if (isReverse) {
            index = len;
            e.moveNext = function () {
                index--;
                if (index < 0) {
                    e.current = undefined;
                    return false;
                }
                e.current = arr[index];
                return true;
            };
        } else {
            index = -1;
            e.moveNext = function () {
                index++;
                if (index >= len) {
                    e.current = undefined;
                    return false;
                }
                e.current = arr[index];
                return true;
            };
        }
        return e;
    };
}