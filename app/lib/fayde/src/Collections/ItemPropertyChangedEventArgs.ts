/// <reference path="../Core/INotifyPropertyChanged.ts" />

module Fayde.Collections {
    export class ItemPropertyChangedEventArgs<T> extends PropertyChangedEventArgs {
        Item: T;
        constructor(item: T, propertyName: string) {
            super(propertyName);
            Object.defineProperty(this, "Item", { value: item, writable: false });
        }
    }
}