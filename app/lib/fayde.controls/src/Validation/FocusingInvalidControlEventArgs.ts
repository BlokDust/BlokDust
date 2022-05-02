module Fayde.Controls {
    export class FocusingInvalidControlEventArgs implements nullstone.IEventArgs {
        Handled: boolean = false;
        Item: ValidationSummaryItem;
        Target: ValidationSummaryItemSource;

        constructor (item: ValidationSummaryItem, target: ValidationSummaryItemSource) {
            Object.defineProperties(this, {
                "Item": {
                    value: item,
                    writable: false
                },
                "Target": {
                    value: target,
                    writable: false
                }
            });
        }
    }
}