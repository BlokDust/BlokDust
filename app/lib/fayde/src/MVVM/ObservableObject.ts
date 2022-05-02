/// <reference path="../Core/INotifyPropertyChanged.ts" />

module Fayde.MVVM {
    export function NotifyProperties(type: any, propNames: string[]) {
        var len = propNames.length;
        for (var i = 0; i < len; i++) {
            (function () {
                var propName = propNames[i];
                var backingName = "$" + propName + "$";
                Object.defineProperty(type.prototype, propName, {
                    get: function () { return this[backingName]; },
                    set: function (value: any) {
                        this[backingName] = value;
                        this.OnPropertyChanged(propName);
                    }
                });
            })();
        }
    }

    export class ObservableObject implements INotifyPropertyChanged {
        PropertyChanged = new nullstone.Event<PropertyChangedEventArgs>();
        OnPropertyChanged(propertyName: string) {
            this.PropertyChanged.raise(this, new PropertyChangedEventArgs(propertyName));
        }
    }
    Fayde.CoreLibrary.add(ObservableObject);
}