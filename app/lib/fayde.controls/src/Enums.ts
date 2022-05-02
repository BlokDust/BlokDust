module Fayde.Controls {
    export enum ValidSpinDirections {
        None = 0,
        Increase = 1,
        Decrease = 2
    }
    Library.addEnum(ValidSpinDirections, "ValidSpinDirections");

    export enum SpinDirection {
        Increase,
        Decrease
    }
    Library.addEnum(SpinDirection, "SpinDirection");

    export enum InvalidInputAction {
        UseFallbackItem,
        TextBoxCannotLoseFocus
    }
    Library.addEnum(InvalidInputAction, "InvalidInputAction");

    export enum Dock {
        Left,
        Top,
        Right,
        Bottom
    }
    Library.addEnum(Dock, "Dock");

    export enum DatePickerFormat {
        Long,
        Short,
    }
    Library.addEnum(DatePickerFormat, "DatePickerFormat");

    export enum TimeDisplayMode {
        Regular,
        Military
    }
    Library.addEnum(TimeDisplayMode, "TimeDisplayMode");

    export enum ValidationSummaryFilters {
        None = 0,
        ObjectErrors = 1,
        PropertyErrors = 2,
        All = PropertyErrors | ObjectErrors,
    }
    Library.addEnum(ValidationSummaryFilters, "ValidationSummaryFilters");

    export enum ValidationSummaryItemType {
        ObjectError = 1,
        PropertyError = 2,
    }
    Library.addEnum(ValidationSummaryItemType, "ValidationSummaryItemType");

    export enum StretchDirection {
        UpOnly,
        DownOnly,
        Both,
    }
    Library.addEnum(StretchDirection, "StretchDirection");
}