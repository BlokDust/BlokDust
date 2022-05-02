module Fayde.Validation {
    export class ValidationErrorEventArgs extends RoutedEventArgs {
        Action: ValidationErrorEventAction;
        Error: ValidationError;

        constructor (action: ValidationErrorEventAction, error: ValidationError) {
            super();
            Object.defineProperties(this, {
                "Action": {
                    value: action,
                    writable: false
                },
                "Error": {
                    value: error,
                    writable: false
                }
            });
        }
    }
}
