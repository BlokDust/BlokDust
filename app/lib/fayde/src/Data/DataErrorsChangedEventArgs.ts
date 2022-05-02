module Fayde.Data {
    export class DataErrorsChangedEventArgs implements nullstone.IEventArgs {
        PropertyName: string;

        constructor (propertyName: string) {
            this.PropertyName = propertyName;
            Object.freeze(this);
        }
    }
}