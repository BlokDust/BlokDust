/// <reference path="ObservableCollection.ts" />

module Fayde.Collections {
    export class DeepObservableCollection<T> extends ObservableCollection<T> {
        ItemPropertyChanged = new nullstone.Event<ItemPropertyChangedEventArgs<T>>();
        constructor() {
            super();
            this.CollectionChanged.on(this._OnCollectionChanged, this);
        }

        private _OnCollectionChanged(sender: any, e: CollectionChangedEventArgs) {
            if (e.NewItems) {
                for (var i = 0; i < e.NewItems.length; i++) {
                    var notify = INotifyPropertyChanged_.as(e.NewItems[i]);
                    if (notify)
                        notify.PropertyChanged.on(this._OnItemPropertyChanged, this);
                }
            }
            if (e.OldItems) {
                for (var i = 0; i < e.OldItems.length; i++) {
                    var notify = INotifyPropertyChanged_.as(e.OldItems[i]);
                    if (notify)
                        notify.PropertyChanged.off(this._OnItemPropertyChanged, this);
                }
            }
        }
        private _OnItemPropertyChanged(sender: T, e: PropertyChangedEventArgs) {
            this.ItemPropertyChanged.raise(this, new ItemPropertyChangedEventArgs<T>(sender, e.PropertyName));
        }
    }
} 