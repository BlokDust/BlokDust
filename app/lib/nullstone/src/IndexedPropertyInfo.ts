module nullstone {
    export interface IIndexedPropertyInfo {
        getValue(obj: any, index: number): any;
        setValue(obj: any, index: number, value: any);
    }

    export class IndexedPropertyInfo implements IIndexedPropertyInfo {
        GetFunc: (index: number) => any;
        SetFunc: (index: number, value: any) => any;

        get propertyType (): Function {
            //NotImplemented
            return undefined;
        }

        getValue (ro: any, index: number): any {
            if (this.GetFunc)
                return this.GetFunc.call(ro, index);
        }

        setValue (ro: any, index: number, value: any) {
            if (this.SetFunc)
                this.SetFunc.call(ro, index, value);
        }

        static find (typeOrObj): IndexedPropertyInfo {
            var o = typeOrObj;
            var isType = typeOrObj instanceof Function;
            if (isType)
                o = new typeOrObj();

            if (o instanceof Array) {
                var pi = new IndexedPropertyInfo();
                pi.GetFunc = function (index) {
                    return this[index];
                };
                pi.SetFunc = function (index, value) {
                    this[index] = value;
                };
                return pi;
            }
            var coll = ICollection_.as(o);
            if (coll) {
                var pi = new IndexedPropertyInfo();
                pi.GetFunc = function (index) {
                    return this.GetValueAt(index);
                };
                pi.SetFunc = function (index, value) {
                    return this.SetValueAt(index, value);
                };
                return pi;
            }
        }
    }
}