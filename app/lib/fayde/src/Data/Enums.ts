module Fayde.Data {
    export enum RelativeSourceMode {
        TemplatedParent = 0,
        Self = 1,
        FindAncestor = 2,
        ItemsControlParent = 3,
    }
    Fayde.CoreLibrary.addEnum(RelativeSourceMode, "RelativeSourceMode");

    export enum BindingMode {
        OneWay = 0,
        TwoWay = 1,
        OneTime = 2,
        OneWayToSource = 3,
    }
    Fayde.CoreLibrary.addEnum(BindingMode, "BindingMode");

    export enum UpdateSourceTrigger {
        Default = 0,
        PropertyChanged = 1,
        Explicit = 3,
    }
    Fayde.CoreLibrary.addEnum(UpdateSourceTrigger, "UpdateSourceTrigger");
}