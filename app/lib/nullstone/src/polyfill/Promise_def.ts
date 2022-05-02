interface IFulfilledFunc<T, TResult> {
    (value: T): void | TResult | Promise<TResult>;
}
interface IRejectedFunc<TResult> {
    (reason: any): void | TResult | Promise<TResult>;
}
interface IResolveFunc<T> {
    (value?: T | Promise<T>): void;
}
interface IRejectFunc {
    (reason?: any): void;
}

interface Promise<T> {
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onFulfilled The callback to execute when the Promise is resolved.
     * @param onRejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult>(onFulfilled?: IFulfilledFunc<T, TResult>, onRejected?: IRejectedFunc<TResult>): Promise<TResult>;

    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onRejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch(onRejected?: (reason: any) => T | Promise<T>): Promise<T>;

    /**
     * Attaches a callback for the resolution and/or reject of the Promise. Passes result into following continuation.
     * @param onFulfilled The callback to execute when the Promise is resolved.
     * @param onRejected The callback to execute when the Promise is rejected.
     * @returns A promise for the completion of the current Promise.
     */
    tap(onFulfilled?: (value: T) => void, onRejected?: (err: any) => void): Promise<T>;
}


interface PromiseConstructor {
    /**
     * A reference to the prototype.
     */
    prototype: Promise<any>;

    /**
     * Creates a new Promise.
     * @param init A callback used to initialize the promise. This callback is passed two arguments:
     * a resolve callback used resolve the promise with a value or the result of another promise,
     * and a reject callback used to reject the promise with a provided reason or error.
     */
    new <T>(init: (resolve: (value?: T | Promise<T>) => void, reject: (reason?: any) => void) => void): Promise<T>;

    <T>(init: (resolve: (value?: T | Promise<T>) => void, reject: (reason?: any) => void) => void): Promise<T>;

    /**
     * Creates a Promise that is resolved with an array of results when all of the provided Promises
     * resolve, or rejected when any Promise is rejected.
     * @param values An array of Promises.
     * @returns A new Promise.
     */
    all<T>(values: Promise<void>[]): Promise<void>;

    /**
     * Creates a Promise that is resolved with an array of results when all of the provided Promises
     * resolve, or rejected when any Promise is rejected.
     * @param values The Promises to complete.
     * @returns A new Promise.
     */
    all<T>(...values: Promise<void>[]): Promise<void>;

    /**
     * Creates a Promise that is resolved with an array of results when all of the provided Promises
     * resolve, or rejected when any Promise is rejected.
     * @param values An array of Promises.
     * @returns A new Promise.
     */
    all<T>(values: (T | Promise<T>)[]): Promise<T[]>;

    /**
     * Creates a Promise that is resolved with an array of results when all of the provided Promises
     * resolve, or rejected when any Promise is rejected.
     * @param values The Promises to complete.
     * @returns A new Promise.
     */
    all<T>(...values: (T | Promise<T>)[]): Promise<T[]>;

    /**
     * Creates a Promise that is resolved or rejected when any of the provided Promises are resolved
     * or rejected.
     * @param values An array of Promises.
     * @returns A new Promise.
     */
    race<T>(values: Promise<T>[]): Promise<T>;

    /**
     * Creates a new rejected promise for the provided reason.
     * @param reason The reason the promise was rejected.
     * @returns A new rejected Promise.
     */
    reject(reason: any): Promise<void>;

    /**
     * Creates a new rejected promise for the provided reason.
     * @param reason The reason the promise was rejected.
     * @returns A new rejected Promise.
     */
    reject<T>(reason: any): Promise<T>;

    /**
     * Creates a new resolved promise for the provided value.
     * @param value A promise.
     * @returns A promise whose internal state matches the provided promise.
     */
    resolve<T>(value: T | Promise<T>): Promise<T>;

    /**
     * Creates a new resolved promise .
     * @returns A resolved promise.
     */
    resolve(): Promise<void>;
}

declare var Promise: PromiseConstructor;