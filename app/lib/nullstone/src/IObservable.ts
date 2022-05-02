module nullstone {
    export interface IDisposable {
        dispose();
    }
    export var IDisposable_ = new Interface<IDisposable>("IDisposable");

    export interface IObservable<T> {
        subscribe(observer: IObserver<T>): IDisposable;
    }
    export var IObservable_ = new Interface<IObservable<any>>("IObservable");
}