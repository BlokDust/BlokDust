module Fayde.Controls {
    export class ValidationSummaryItemSource {
        PropertyName: string;
        Control: Control;

        constructor (propertyName: string, control?: Control) {
            Object.defineProperties(this, {
                "PropertyName": {
                    value: propertyName,
                    writable: false
                },
                "Control": {
                    value: control || null,
                    writable: false
                }
            });
        }

        Equals (other: any): boolean {
            if (!(other instanceof ValidationSummaryItemSource))
                return false;
            var vsis = <ValidationSummaryItemSource>other;
            return vsis.PropertyName === this.PropertyName && vsis.Control === this.Control;
        }
    }
}