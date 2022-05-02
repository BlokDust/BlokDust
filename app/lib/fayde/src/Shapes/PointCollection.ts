/// <reference path="../Core/XamlObjectCollection.ts" />

module Fayde.Shapes {
    export class PointCollection implements nullstone.ICollection<Point> {
        private _ht: Point[] = [];

        get Count () {
            return this._ht.length;
        }

        static FromData (data: string): PointCollection {
            var pc = new PointCollection();
            pc._ht = pc._ht.concat(Media.ParseShapePoints(data));
            return pc;
        }

        static FromArray (data: Point[]): PointCollection {
            var pc = new PointCollection();
            pc._ht = pc._ht.concat(data);
            return pc;
        }

        GetValueAt (index: number): Point {
            return this._ht[index];
        }

        SetValueAt (index: number, value: Point): boolean {
            if (index < 0 || index >= this._ht.length)
                return false;
            var removed = this._ht[index];
            var added = value;
            this._ht[index] = added;

            Incite(this);
        }

        Add (value: Point) {
            this._ht.push(value);
            Incite(this);
        }

        AddRange (points: Point[]) {
            this._ht.push.apply(this._ht, points);
            Incite(this);
        }

        Insert (index: number, value: Point) {
            if (index < 0)
                return;
            var len = this._ht.length;
            if (index > len)
                index = len;
            this._ht.splice(index, 0, value);
            Incite(this);
        }

        Remove (value: Point): boolean {
            var index = this.IndexOf(value);
            if (index === -1)
                return false;
            this.RemoveAt(index);
            Incite(this);
            return true;
        }

        RemoveAt (index: number) {
            if (index < 0 || index >= this._ht.length)
                return;
            var value = this._ht.splice(index, 1)[0];
            Incite(this);
        }

        Clear () {
            this._ht = [];
            Incite(this);
        }

        IndexOf (value: Point): number {
            var count = this._ht.length;
            for (var i = 0; i < count; i++) {
                if (nullstone.equals(value, this._ht[i]))
                    return i;
            }
            return -1;
        }

        Contains (value: Point): boolean {
            return this.IndexOf(value) > -1;
        }

        getEnumerator (reverse?: boolean): nullstone.IEnumerator<Point> {
            return nullstone.IEnumerator_.fromArray(this._ht, reverse);
        }
    }
    Fayde.CoreLibrary.add(PointCollection);
    nullstone.ICollection_.mark(PointCollection);

    nullstone.registerTypeConverter(PointCollection, (val: string): PointCollection => {
        var pc = new PointCollection();
        pc.AddRange(Fayde.Media.ParseShapePoints(val));
        return pc;
    });
}