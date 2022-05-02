module nullstone {
    export interface IPropertyInfo {
        name: string;
        getValue(obj: any): any;
        setValue(obj: any, value: any);
    }

    export class PropertyInfo implements IPropertyInfo {
        private $$getFunc: () => any;
        private $$setFunc: (value: any) => any;

        name: string;

        getValue (obj: any): any {
            if (this.$$getFunc)
                return this.$$getFunc.call(obj);
        }

        setValue (obj: any, value: any) {
            if (this.$$setFunc)
                return this.$$setFunc.call(obj, value);
        }

        static find (typeOrObj: any, name: string): IPropertyInfo {
            var o = typeOrObj;
            var isType = typeOrObj instanceof Function;
            if (isType)
                o = new typeOrObj();

            if (!(o instanceof Object))
                return null;

            var nameClosure = name;
            var propDesc = getPropertyDescriptor(o, name);
            if (propDesc) {
                var pi = new PropertyInfo();
                pi.name = name;
                pi.$$getFunc = propDesc.get;
                if (!pi.$$getFunc)
                    pi.$$getFunc = function () {
                        return this[nameClosure];
                    };
                pi.$$setFunc = propDesc.set;
                if (!pi.$$setFunc && propDesc.writable)
                    pi.$$setFunc = function (value) {
                        this[nameClosure] = value;
                    };
                return pi;
            }

            var type = isType ? typeOrObj : typeOrObj.constructor;
            var pi = new PropertyInfo();
            pi.name = name;
            pi.$$getFunc = type.prototype["Get" + name];
            pi.$$setFunc = type.prototype["Set" + name];
            return pi;
        }
    }
}