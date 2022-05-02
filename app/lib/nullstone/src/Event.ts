module nullstone {
    export interface IEventArgs {
    }
    export interface IEventCallback<T extends IEventArgs> {
        (sender: any, args: T);
    }
    export interface IObserverFunc<T> extends Function {
        (value: T): any;
    }

    export class Event<T extends IEventArgs> implements IObservable<T> {
        private $$callbacks: IEventCallback<T>[] = [];
        private $$scopes: any[] = [];

        get has (): boolean {
            return this.$$callbacks.length > 0;
        }

        on (callback: IEventCallback<T>, scope: any) {
            this.$$callbacks.push(callback);
            this.$$scopes.push(scope);
        }

        off (callback: IEventCallback<T>, scope: any) {
            var cbs = this.$$callbacks;
            var scopes = this.$$scopes;
            var search = cbs.length - 1;
            while (search > -1) {
                search = cbs.lastIndexOf(callback, search);
                if (scopes[search] === scope) {
                    cbs.splice(search, 1);
                    scopes.splice(search, 1);
                }
                search--;
            }
        }

        raise (sender: any, args: T) {
            for (var i = 0, cbs = this.$$callbacks.slice(0), scopes = this.$$scopes.slice(0), len = cbs.length; i < len; i++) {
                cbs[i].call(scopes[i], sender, args);
            }
        }

        raiseAsync (sender: any, args: T) {
            window.setTimeout(() => this.raise(sender, args), 1);
        }

        subscribe (observer: IObserver<T>|IObserverFunc<T>): IDisposable {
            var handler: IEventCallback<T>;
            if (observer instanceof Function)
                handler = (sender, args: T) => observer(args);
            else
                handler = (sender, args: T) => (<IObserver<T>>observer).onNext(args);
            this.on(handler, observer);
            return <IDisposable>{
                dispose: () => this.off(handler, observer)
            };
        }
    }
}