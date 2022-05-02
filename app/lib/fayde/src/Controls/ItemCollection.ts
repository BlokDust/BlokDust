/// <reference path="../Core/DependencyObject.ts" />

module Fayde.Controls {
    export interface IItemCollection extends nullstone.ICollection<any> {
        ItemsChanged: nullstone.Event<Collections.CollectionChangedEventArgs>;
        ToArray(): any[];

        GetRange(startIndex: number, endIndex: number): any[];
        Contains(value: any): boolean;
        IndexOf(value: any): number;
        AddRange(values: any[]);
    }

    export class ItemCollection extends XamlObjectCollection<any> implements IItemCollection {
        ItemsChanged = new nullstone.Event<Collections.CollectionChangedEventArgs>();

        ToArray (): any[] {
            return this._ht.slice(0);
        }

        get Count (): number {
            return this._ht.length;
        }

        IsReadOnly: boolean = false;

        GetValueAt (index: number): XamlObject {
            var ht = this._ht;
            if (index < 0 || index >= ht.length)
                throw new IndexOutOfRangeException(index);
            return ht[index];
        }

        GetRange (startIndex: number, endIndex: number): XamlObject[] {
            return this._ht.slice(startIndex, endIndex + 1);
        }

        SetValueAt (index: number, value: XamlObject): boolean {
            this._ValidateReadOnly();
            this.SetValueAtImpl(index, value);
            return true;
        }

        SetValueAtImpl (index: number, value: any) {
            var ht = this._ht;
            if (index < 0 || index >= ht.length)
                throw new IndexOutOfRangeException(index);
            var oldValue = ht[index];
            ht[index] = value;
            this.ItemsChanged.raise(this, Collections.CollectionChangedEventArgs.Replace(value, oldValue, index));
        }

        Add (value: XamlObject): number {
            this._ValidateReadOnly();
            if (value == null)
                throw new ArgumentException("value");
            return this.AddImpl(value);
        }

        AddImpl (value: any): number {
            var index = this._ht.push(value) - 1;
            this.ItemsChanged.raise(this, Collections.CollectionChangedEventArgs.Add(value, index));
            return index;
        }

        AddRange (values: any[]) {
            this._ValidateReadOnly();
            if (!values) return;
            for (var i = 0; i < values.length; i++) {
                if (values[i] == null) throw new ArgumentException("value");
            }
            this.AddRangeImpl(values);
        }

        AddRangeImpl (values: any[]) {
            var index = this._ht.length;
            this._ht = this._ht.concat(values);
            this.ItemsChanged.raise(this, Collections.CollectionChangedEventArgs.AddRange(values, index));
        }

        Insert (index: number, value: XamlObject): boolean {
            this._ValidateReadOnly();
            if (value == null)
                throw new ArgumentException("value");
            this.InsertImpl(index, value);
            return true;
        }

        InsertImpl (index: number, value: XamlObject) {
            var ht = this._ht;
            if (index < 0 || index > ht.length)
                throw new IndexOutOfRangeException(index);
            if (index >= ht.length)
                ht.push(value);
            else
                ht.splice(index, 0, value);
            this.ItemsChanged.raise(this, Collections.CollectionChangedEventArgs.Add(value, index));
        }

        IndexOf (value: XamlObject): number {
            return this._ht.indexOf(value);
        }

        Contains (value: XamlObject): boolean {
            return this._ht.indexOf(value) > -1;
        }

        Remove (value: XamlObject): boolean {
            this._ValidateReadOnly();
            this.RemoveImpl(value);
            return true;
        }

        RemoveImpl (value: XamlObject) {
            var index = this._ht.indexOf(value);
            if (index < 0)
                return;
            this._ht.splice(index, 1);
            this.ItemsChanged.raise(this, Collections.CollectionChangedEventArgs.Remove(value, index));
        }

        RemoveAt (index: number): boolean {
            this._ValidateReadOnly();
            if (index < 0 || index >= this._ht.length)
                throw new IndexOutOfRangeException(index);
            this.RemoveAtImpl(index);
            return true;
        }

        RemoveAtImpl (index: number) {
            var item = this._ht.splice(index, 1)[0];
            this.ItemsChanged.raise(this, Collections.CollectionChangedEventArgs.Remove(item, index));
        }

        Clear (): boolean {
            this._ValidateReadOnly();
            this.ClearImpl();
            return true;
        }

        ClearImpl () {
            var old = this._ht;
            this._ht = [];
            this.ItemsChanged.raise(this, Collections.CollectionChangedEventArgs.Reset(old));
        }

        private _ValidateReadOnly () {
            if (this.IsReadOnly)
                throw new InvalidOperationException("The collection is readonly.");
        }
    }
    Fayde.CoreLibrary.add(ItemCollection);
}