/// <reference path="../Collections/ObservableCollection" />
/// <reference path="../Collections/ReadOnlyObservableCollection" />

module Fayde.Validation {
    import ObservableCollection = Collections.ObservableCollection;
    import ReadOnlyObservableCollection = Collections.ReadOnlyObservableCollection;

    class Validation extends DependencyObject {
    }
    Fayde.CoreLibrary.add(Validation, "Validation");

    export var HasErrorProperty = DependencyProperty.RegisterAttached("HasError", () => Boolean, Validation);
    export var ErrorsProperty = DependencyProperty.RegisterAttached("Errors", () => ReadOnlyObservableCollection, Validation);
    var ErrorsCoreProperty = DependencyProperty.RegisterAttached("ErrorsCore", () => ObservableCollection, Validation);

    function GetErrorsCore (dobj: DependencyObject) {
        if (!dobj)
            throw new ArgumentNullException("element");

        var result: ObservableCollection<ValidationError> = dobj.GetValue(ErrorsCoreProperty);
        if (result == null) {
            result = new ObservableCollection<ValidationError>();
            dobj.SetValue(ErrorsCoreProperty, result);
        }

        return result;
    }

    export function GetErrors (dobj: DependencyObject): ReadOnlyObservableCollection<ValidationError> {
        if (!dobj)
            throw new ArgumentNullException("element");

        var result: ReadOnlyObservableCollection<ValidationError> = dobj.GetValue(ErrorsProperty);
        if (result == null) {
            result = new ReadOnlyObservableCollection<ValidationError>(GetErrorsCore(dobj));
            dobj.SetValue(ErrorsProperty, result);
        }
        return result;
    }

    export function GetHasError (dobj: DependencyObject): boolean {
        if (dobj == null)
            throw new ArgumentNullException("element");
        return dobj.GetValue(HasErrorProperty) === true;
    }

    function SetHasError (dobj: DependencyObject, value: boolean) {
        dobj.SetValue(HasErrorProperty, value === true);
    }

    export function AddError (element: FrameworkElement, error: ValidationError) {
        var errors = GetErrorsCore(element);
        GetErrors(element); //ensure Validation.Errors gets created
        errors.Add(error);
        if (errors.Count === 1)
            SetHasError(element, true);

        if (element instanceof Controls.Control)
            (<Controls.Control>element).UpdateValidationState(false);
    }

    export function RemoveError (element: FrameworkElement, error: ValidationError) {
        var errors = GetErrorsCore(element);
        GetErrors(element); //ensure Validation.Errors gets created
        if (errors.Remove(error)) {
            if (errors.Count === 0) {
                SetHasError(element, false);
                if (element instanceof Controls.Control)
                    (<Controls.Control>element).UpdateValidationState(true);
            }
        }
    }
}