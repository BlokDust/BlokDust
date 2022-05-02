module Fayde.Collections {
    export class ReadOnlyObservableCollection<T> implements nullstone.ICollection<T>, INotifyCollectionChanged, INotifyPropertyChanged {
        get Count (): number {
            return this._Source.Count;
        }

        private _Source: ObservableCollection<T>;

        CollectionChanged = new nullstone.Event<CollectionChangedEventArgs>();
        PropertyChanged = new nullstone.Event<PropertyChangedEventArgs>();

        constructor (source: ObservableCollection<T>) {
            this._Source = source;
            this._Source.CollectionChanged.on(this._OnCollectionChanged, this);
            this._Source.PropertyChanged.on(this._OnPropertyChanged, this);
        }

        GetValueAt (index: number) {
            return this._Source.GetValueAt(index);
        }

        getEnumerator (): nullstone.IEnumerator<T> {
            return this._Source.getEnumerator();
        }

        ToArray (): T[] {
            return this._Source.ToArray();
        }

        IndexOf (value: T): number {
            return this._Source.IndexOf(value);
        }

        Contains (value: T): boolean {
            return this._Source.Contains(value);
        }

        private _OnCollectionChanged (sender: any, args: CollectionChangedEventArgs) {
            this.CollectionChanged.raise(this, args);
        }

        private _OnPropertyChanged (sender: any, args: PropertyChangedEventArgs) {
            this.PropertyChanged.raise(this, args);
        }

        SetValueAt (index: number, value: T) {
            throw new Error("Collection is read only.");
        }

        Insert (index: number, value: T) {
            throw new Error("Collection is read only.");
        }

        Add (value: T) {
            throw new Error("Collection is read only.");
        }

        Remove (value: T): boolean {
            throw new Error("Collection is read only.");
        }

        RemoveAt (index: number) {
            throw new Error("Collection is read only.");
        }

        Clear () {
            throw new Error("Collection is read only.");
        }
    }
    Fayde.CoreLibrary.add(ObservableCollection);
    nullstone.addTypeInterfaces(ReadOnlyObservableCollection, nullstone.ICollection_, INotifyCollectionChanged_, INotifyPropertyChanged_);
}