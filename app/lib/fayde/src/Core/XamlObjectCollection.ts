/// <reference path="XamlObject.ts" />

module Fayde {
    export class XamlObjectCollection<T extends XamlObject> extends XamlObject implements nullstone.ICollection<T> {
        _ht: Array<T> = [];

        AttachTo (xobj: XamlObject) {
            var error = new BError();
            if (!this.XamlNode.AttachTo(xobj.XamlNode, error))
                error.ThrowException();
        }

        get Count () {
            return this._ht.length;
        }

        GetRange (startIndex: number, endIndex: number): T[] {
            return this._ht.slice(startIndex, endIndex);
        }

        GetValueAt (index: number): T {
            return this._ht[index];
        }

        SetValueAt (index: number, value: T): boolean {
            if (!this.CanAdd(value))
                return false;

            if (index < 0 || index >= this._ht.length)
                return false;

            var removed = this._ht[index];
            var added = value;

            var error = new BError();
            if (this.AddingToCollection(added, error)) {
                this._ht[index] = added;
                this.RemovedFromCollection(removed, true);
                this._RaiseItemReplaced(removed, added, index);
                return true;
            }
            return false;
        }

        Add (value: T): number {
            var rv = this.Insert(this._ht.length, value);
            return rv ? this._ht.length - 1 : -1;
        }

        Insert (index: number, value: T): boolean {
            if (!this.CanAdd(value))
                return false;
            if (index < 0)
                return false;
            var count = this._ht.length;
            if (index > count)
                index = count;

            var error = new BError();
            if (this.AddingToCollection(value, error)) {
                this._ht.splice(index, 0, value);
                this._RaiseItemAdded(value, index);
                return true;
            }
            if (error.Message)
                throw new Exception(error.Message);
            return false;
        }

        Remove (value: T): boolean {
            var index = this.IndexOf(value);
            if (index === -1)
                return false;
            return this.RemoveAt(index);
        }

        RemoveAt (index: number): boolean {
            if (index < 0 || index >= this._ht.length)
                return false;
            var value = this._ht[index];
            this._ht.splice(index, 1);
            this.RemovedFromCollection(value, true);
            this._RaiseItemRemoved(value, index);
            return true;
        }

        Clear (): boolean {
            var old = this._ht;
            //LOOKS USELESS: this._RaiseClearing(old);
            this._ht = [];
            var len = old.length;
            for (var i = 0; i < len; i++) {
                this.RemovedFromCollection(old[i], true);
            }
            this._RaiseCleared(old);
            return true;
        }

        IndexOf (value: T): number {
            return this._ht.indexOf(value);
        }

        Contains (value: T): boolean {
            return this.IndexOf(value) > -1;
        }

        CanAdd (value: T): boolean {
            return true;
        }

        AddingToCollection (value: T, error: BError): boolean {
            if (value instanceof XamlObject)
                return value.XamlNode.AttachTo(this.XamlNode, error);
            return true;
        }

        RemovedFromCollection (value: T, isValueSafe: boolean) {
            if (value instanceof XamlObject)
                value.XamlNode.Detach();
        }

        getEnumerator (reverse?: boolean): nullstone.IEnumerator<T> {
            return nullstone.IEnumerator_.fromArray(this._ht, reverse);
        }

        GetNodeEnumerator<U extends XamlNode>(reverse?: boolean): nullstone.IEnumerator<U> {
            var prev = this.getEnumerator(reverse);
            return {
                current: undefined,
                moveNext: function (): boolean {
                    if (!prev.moveNext()) {
                        this.current = undefined;
                        return false;
                    }
                    var xobj = prev.current;
                    this.current = xobj.XamlNode;
                    return true;
                }
            };
        }

        _RaiseItemAdded (value: T, index: number) {
        }

        _RaiseItemRemoved (value: T, index: number) {
        }

        _RaiseItemReplaced (removed: T, added: T, index: number) {
        }

        //_RaiseClearing(arr: T[]) { }
        _RaiseCleared (old: T[]) {
        }

        CloneCore (source: XamlObjectCollection<T>) {
            for (var en = source.getEnumerator(); en.moveNext();) {
                this.Add(Fayde.Clone(en.current));
            }
        }

        ToArray (): T[] {
            return this._ht.slice(0);
        }
    }
    nullstone.ICollection_.mark(XamlObjectCollection);
}