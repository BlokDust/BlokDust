module Fayde.MVVM {
    export interface IValidationFunc {
        (value: any, propertyName: string, entity: any): any[];
    }
    export interface IAutoApplier<T> {
        Notify(...properties: string[]): IAutoApplier<T>;
        Notify(properties: string[]): IAutoApplier<T>;
        Validate(propertyName: string, ...validators: IValidationFunc[]): IAutoApplier<T>;
        Finish(): T;
    }
    export function AutoModel<T> (typeOrModel: any): IAutoApplier<T> {
        var obj = getApplier(typeOrModel);

        var props: string[] = [];
        var validators: IValidationFunc[][] = [];

        var applier = <IAutoApplier<T>>{
            Notify (...properties: string[]): IAutoApplier<T> {
                for (var i = 0; i < properties.length; i++) {
                    var prop = properties[i];
                    if (typeof prop === "string")
                        props.push(prop);
                    else if (Array.isArray(prop))
                        props = props.concat(prop);
                }
                return applier;
            },
            Validate (propertyName: string, ...validations: IValidationFunc[]): IAutoApplier<T> {
                var cur = validators[propertyName];
                if (!cur)
                    validators[propertyName] = validations;
                else
                    validators[propertyName] = cur.concat(validations);
                return applier;
            },
            Finish (): T {
                for (var i = 0, uprops = unique(props), len = uprops.length; i < len; i++) {
                    var prop = uprops[i];
                    applyProperty(obj, prop, validators[prop]);
                }
                return obj;
            }
        };
        return applier;
    }

    function getApplier (typeOrModel: any): any {
        if (typeof typeOrModel === "function")
            return typeOrModel.prototype;
        return typeOrModel;
    }

    function unique (arr: string[]): string[] {
        var re: string[] = [];
        for (var i = 0; i < arr.length; i++) {
            var cur = arr[i];
            if (re.indexOf(cur) > -1)
                continue;
            re.push(cur);
        }
        return re;
    }

    function applyProperty (obj: any, propertyName: string, validations: IValidationFunc[]) {
        var initial = obj[propertyName];
        var backingName = "_$" + propertyName + "$_";
        obj[backingName] = initial;
        if (validations && validations.length > 0) {
            Object.defineProperty(obj, propertyName, {
                get: function () {
                    return this[backingName];
                },
                set: function (value: any) {
                    this[backingName] = value;
                    doValidate(this, value, propertyName, validations);
                    this.OnPropertyChanged(propertyName);
                }
            });
        } else {
            Object.defineProperty(obj, propertyName, {
                get: function () {
                    return this[backingName];
                },
                set: function (value: any) {
                    this[backingName] = value;
                    this.OnPropertyChanged(propertyName);
                }
            });
        }
    }

    function doValidate (entity: any, value: any, propertyName: string, validations: IValidationFunc[]) {
        var errs = validate(entity, value, propertyName, validations);
        entity.ClearErrors && entity.ClearErrors(propertyName);
        if (!entity.AddError)
            return;
        for (var i = 0; i < errs.length; i++) {
            entity.AddError(propertyName, errs[i]);
        }
    }

    function validate (entity: any, value: any, propertyName: string, validations: IValidationFunc[]): string[] {
        var all: string[] = [];
        for (var i = 0; i < validations.length; i++) {
            var func = validations[i];
            var errors = func(value, propertyName, entity);
            if (errors)
                all = all.concat(errors);
        }
        return all;
    }
}