module Fayde.Data {
    export interface INotifyDataErrorInfo {
        ErrorsChanged: nullstone.Event<DataErrorsChangedEventArgs>;
        GetErrors(propertyName: string): nullstone.IEnumerable<any>;
        HasErrors: boolean;
    }
    export var INotifyDataErrorInfo_ = new nullstone.Interface<INotifyDataErrorInfo>("INotifyDataErrorInfo");
}