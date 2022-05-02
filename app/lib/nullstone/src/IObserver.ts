module nullstone {
    export interface IObserver<T> {
        onCompleted();
        onError(err: Error);
        onNext(value: T);
    }
    export var IObserver_ = new Interface<IObserver<any>>("IObserver");
    IObserver_.is = (o: any): boolean => {
        return o
            && typeof o.onNext === "function"
            && typeof o.onCompleted === "function"
            && typeof o.onNext === "function";
    };
}