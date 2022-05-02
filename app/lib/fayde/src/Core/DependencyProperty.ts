interface IOutIsValid {
    IsValid: boolean;
}

interface IType {
}

class DependencyProperty {
    static UnsetValue = {};

    private static _IDs: DependencyProperty[] = [];
    private static _LastID: number = 0;

    _ID: number;
    Name: string;
    GetTargetType: () => IType;
    OwnerType: any;
    DefaultValue: any;
    IsReadOnly: boolean = false;
    IsCustom: boolean = true;
    IsAttached: boolean = false;
    IsInheritable: boolean = false;
    IsImmutable: boolean = false;
    ChangedCallback: (dobj: Fayde.DependencyObject, args: DependencyPropertyChangedEventArgs) => void;
    AlwaysChange: boolean = false;
    Store: Fayde.Providers.PropertyStore;
    private _Coercer: (dobj: Fayde.DependencyObject, propd: DependencyProperty, value: any) => any = null;
    private _Validator: (dobj: Fayde.DependencyObject, propd: DependencyProperty, value: any, original: any) => boolean = null;

    static Register (name: string, getTargetType: () => IType, ownerType: any, defaultValue?: any, changedCallback?: (dobj: Fayde.DependencyObject, args: DependencyPropertyChangedEventArgs) => void) {
        var propd = new DependencyProperty();
        propd.Name = name;
        propd.GetTargetType = getTargetType;
        propd.OwnerType = ownerType;
        propd.DefaultValue = defaultValue;
        propd.ChangedCallback = changedCallback;
        propd.Store = Fayde.Providers.PropertyStore.Instance;
        propd.FinishRegister();
        return propd;
    }

    static RegisterReadOnly (name: string, getTargetType: () => IType, ownerType: any, defaultValue?: any, changedCallback?: (dobj: Fayde.DependencyObject, args: DependencyPropertyChangedEventArgs) => void) {
        var propd = new DependencyProperty();
        propd.Name = name;
        propd.GetTargetType = getTargetType;
        propd.OwnerType = ownerType;
        propd.DefaultValue = defaultValue;
        propd.ChangedCallback = changedCallback;
        propd.IsReadOnly = true;
        propd.Store = Fayde.Providers.PropertyStore.Instance;
        propd.FinishRegister();
        return propd;
    }

    static RegisterAttached (name: string, getTargetType: () => IType, ownerType: any, defaultValue?: any, changedCallback?: (dobj: Fayde.DependencyObject, args: DependencyPropertyChangedEventArgs) => void) {
        var propd = new DependencyProperty();
        propd.Name = name;
        propd.GetTargetType = getTargetType;
        propd.OwnerType = ownerType;
        propd.DefaultValue = defaultValue;
        propd.ChangedCallback = changedCallback;
        propd.IsAttached = true;
        propd.Store = Fayde.Providers.PropertyStore.Instance;
        propd.FinishRegister();
        return propd;
    }

    static RegisterCore (name: string, getTargetType: () => IType, ownerType: any, defaultValue?: any, changedCallback?: (dobj: Fayde.DependencyObject, args: DependencyPropertyChangedEventArgs) => void) {
        var propd = new DependencyProperty();
        propd.Name = name;
        propd.GetTargetType = getTargetType;
        propd.OwnerType = ownerType;
        propd.DefaultValue = defaultValue;
        propd.ChangedCallback = changedCallback;
        propd.IsCustom = false;
        propd.Store = Fayde.Providers.PropertyStore.Instance;
        propd.FinishRegister();
        return propd;
    }

    static RegisterReadOnlyCore (name: string, getTargetType: () => IType, ownerType: any, defaultValue?: any, changedCallback?: (dobj: Fayde.DependencyObject, args: DependencyPropertyChangedEventArgs) => void) {
        var propd = new DependencyProperty();
        propd.Name = name;
        propd.GetTargetType = getTargetType;
        propd.OwnerType = ownerType;
        propd.DefaultValue = defaultValue;
        propd.ChangedCallback = changedCallback;
        propd.IsCustom = false;
        propd.IsReadOnly = true;
        propd.Store = Fayde.Providers.PropertyStore.Instance;
        propd.FinishRegister();
        return propd;
    }

    static RegisterAttachedCore (name: string, getTargetType: () => IType, ownerType: any, defaultValue?: any, changedCallback?: (dobj: Fayde.DependencyObject, args: DependencyPropertyChangedEventArgs) => void) {
        var propd = new DependencyProperty();
        propd.Name = name;
        propd.GetTargetType = getTargetType;
        propd.OwnerType = ownerType;
        propd.DefaultValue = defaultValue;
        propd.ChangedCallback = changedCallback;
        propd.IsCustom = false;
        propd.IsAttached = true;
        propd.Store = Fayde.Providers.PropertyStore.Instance;
        propd.FinishRegister();
        return propd;
    }

    static RegisterImmutable<T>(name: string, getTargetType: () => IType, ownerType: any): ImmutableDependencyProperty<T> {
        var propd = new ImmutableDependencyProperty<T>();
        propd.Name = name;
        propd.GetTargetType = getTargetType;
        propd.OwnerType = ownerType;
        propd.DefaultValue = undefined;
        propd.IsImmutable = true;
        propd.Store = Fayde.Providers.ImmutableStore.Instance;
        propd.FinishRegister();
        return propd;
    }

    static RegisterInheritable (name: string, getTargetType: () => IType, ownerType: any, defaultValue?: any, changedCallback?: (dobj: Fayde.DependencyObject, args: DependencyPropertyChangedEventArgs) => void) {
        var propd = new DependencyProperty();
        propd.Name = name;
        propd.GetTargetType = getTargetType;
        propd.OwnerType = ownerType;
        propd.DefaultValue = defaultValue;
        propd.ChangedCallback = changedCallback;
        propd.IsCustom = true;
        propd.IsInheritable = true;
        propd.Store = Fayde.Providers.InheritedStore.Instance;
        propd.FinishRegister();
        return propd;
    }

    static RegisterFull (name: string, getTargetType: () => IType, ownerType: any, defaultValue?: any, changedCallback?: (dobj: Fayde.DependencyObject, args: DependencyPropertyChangedEventArgs) => void, coercer?: (dobj: Fayde.DependencyObject, propd: DependencyProperty, value: any) => any, alwaysChange?: boolean, validator?: (dobj: Fayde.DependencyObject, propd: DependencyProperty, value: any) => boolean, isCustom?: boolean, isReadOnly?: boolean, isAttached?: boolean): DependencyProperty {
        var propd = new DependencyProperty();
        propd.Name = name;
        propd.GetTargetType = getTargetType;
        propd.OwnerType = ownerType;
        propd.DefaultValue = defaultValue;
        propd.ChangedCallback = changedCallback;
        propd._Coercer = coercer;
        propd.AlwaysChange = alwaysChange;
        propd._Validator = validator;
        propd.IsCustom = isCustom !== false;
        propd.IsReadOnly = isReadOnly === true;
        propd.IsAttached = isAttached === true;
        propd.Store = Fayde.Providers.PropertyStore.Instance;
        propd.FinishRegister();
        return propd;
    }

    private FinishRegister () {
        var name = this.Name;
        var ownerType = this.OwnerType;
        if (!ownerType || typeof ownerType !== "function")
            throw new InvalidOperationException("DependencyProperty does not have a valid OwnerType.");
        var registeredDPs = (<any>ownerType)._RegisteredDPs;
        if (!registeredDPs) {
            var registeredDPs: any = {};
            Object.defineProperty(ownerType, "_RegisteredDPs", {
                value: registeredDPs,
                enumerable: false,
                writable: false
            });
        }
        if (registeredDPs[name] !== undefined)
            throw new InvalidOperationException("Dependency Property is already registered. [" + name + "]");
        registeredDPs[name] = this;
        this._ID = DependencyProperty._LastID = DependencyProperty._LastID + 1;
        DependencyProperty._IDs[this._ID] = this;

        if (this.IsImmutable)
            return;

        var propd = this;
        var getter = function () {
            return (<Fayde.DependencyObject>this).GetValue(propd);
        };
        var setter = function (value) {
            (<Fayde.DependencyObject>this).SetValue(propd, value);
        };
        if (this.IsReadOnly)
            setter = function (value) {
                throw new Exception("Property [" + propd.Name + "] is readonly.");
            };
        Object.defineProperty(ownerType.prototype, this.Name, {
            get: getter,
            set: setter,
            configurable: true
        });
    }

    ExtendTo (type: any): DependencyProperty {
        var registeredDPs = type._RegisteredDPs;
        if (!registeredDPs) {
            var registeredDPs: any = {};
            Object.defineProperty(type, "_RegisteredDPs", {
                value: registeredDPs,
                enumerable: false,
                writable: false
            });
        }
        registeredDPs[this.Name] = this;

        var propd = this;
        var getter = function () {
            return (<Fayde.DependencyObject>this).GetValue(propd);
        };
        var setter = function (value) {
            (<Fayde.DependencyObject>this).SetValue(propd, value);
        };
        Object.defineProperty(type.prototype, this.Name, {
            get: getter,
            set: setter,
            configurable: true
        });
        return this;
    }

    ValidateSetValue (dobj: Fayde.DependencyObject, value: any, isValidOut: IOutIsValid) {
        var coerced = value;
        if (this._Coercer)
            coerced = this._Coercer(dobj, this, coerced);
        /* TODO: Handle Type Problems
         if (!this._IsValueValid(dobj, coerced))
         return coerced;
         */
        isValidOut.IsValid = true;
        if (this._Validator)
            isValidOut.IsValid = !!this._Validator(dobj, this, coerced, value);
        return coerced;
    }

    static GetDependencyProperty (ownerType: any, name: string, noError?: boolean): DependencyProperty {
        if (!ownerType)
            return undefined;
        var reg: DependencyProperty[] = (<any>ownerType)._RegisteredDPs;
        var propd: DependencyProperty;
        if (reg)
            propd = reg[name];
        if (!propd)
            propd = DependencyProperty.GetDependencyProperty(nullstone.getTypeParent(ownerType), name, true);
        if (!propd && !noError)
            throw new Exception("Cannot locate dependency property [" + (<any>ownerType).name + "].[" + name + "]");
        return propd;
    }
}
Fayde.CoreLibrary.add(DependencyProperty);

class ImmutableDependencyProperty<T> extends DependencyProperty {
    IsImmutable: boolean = true;

    Initialize (dobj: Fayde.DependencyObject): T {
        var storage = Fayde.Providers.GetStorage(dobj, this);
        storage.Precedence = Fayde.Providers.PropertyPrecedence.LocalValue;
        var type = <any>this.GetTargetType();
        var obj: T = new type();
        Object.defineProperty(dobj, this.Name, {
            value: obj,
            writable: false
        });
        return storage.Local = obj;
    }
}