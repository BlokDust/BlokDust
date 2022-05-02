module Fayde.Collections {
    export interface IFilterItemFunc<T> {
        (item: T): boolean;
    }
    export interface IFilterItemIndexFunc<T> {
        (item: T, index: number): boolean;
    }

    export class FilteredCollection<T> extends DeepObservableCollection<T> {
        private _Source: DeepObservableCollection<T>;
        get Source () { return this._Source; }
        set Source (value: DeepObservableCollection<T>) { this._SetSource(value); }

        private _Filter: IFilterItemIndexFunc<T>;
        get Filter () {
            return this._Filter;
        }

        set Filter (value: IFilterItemIndexFunc<T>) {
            this._Filter = value;
            this.Update();
        }

        constructor (filter?: IFilterItemFunc<T>, source?: DeepObservableCollection<T>);
        constructor (filter?: IFilterItemIndexFunc<T>, source?: DeepObservableCollection<T>);
        constructor (filter?: IFilterItemIndexFunc<T>, source?: DeepObservableCollection<T>) {
            super();
            this.Filter = filter;
            this._SetSource(source || new DeepObservableCollection<T>());
        }

        private _SetSource (source: DeepObservableCollection<T>) {
            if (this._Source) {
                this._Source.CollectionChanged.off(this._OnSourceCollectionChanged, this);
                this._Source.ItemPropertyChanged.off(this._OnSourceItemPropertyChanged, this);
            }
            this._Source = source;
            if (source) {
                source.CollectionChanged.on(this._OnSourceCollectionChanged, this);
                source.ItemPropertyChanged.on(this._OnSourceItemPropertyChanged, this);
            }
            this.Update();
        }

        private _OnSourceCollectionChanged (sender: any, e: CollectionChangedEventArgs) {
            this.Update();
        }

        private _OnSourceItemPropertyChanged (sender: any, e: ItemPropertyChangedEventArgs<T>) {
            this.Update();
            var index = this.Source.IndexOf(e.Item);
            if (this.Filter && this.Filter(e.Item, index))
                this.ItemPropertyChanged.raise(this, e);
        }

        Update () {
            if (!this._Source)
                return;
            var filter = this.Filter || ((item: T) => true);
            for (var i = 0, j = 0, enumerator = this._Source.getEnumerator(); enumerator.moveNext(); i++) {
                var isIncluded = filter(enumerator.current, i);
                var isCurrent = j < this.Count && this.GetValueAt(j) === enumerator.current;
                if (isIncluded && !isCurrent)
                    this.Insert(j, enumerator.current);
                else if (!isIncluded && isCurrent)
                    this.RemoveAt(j);
                if (isIncluded)
                    j++;
            }
        }
    }
}