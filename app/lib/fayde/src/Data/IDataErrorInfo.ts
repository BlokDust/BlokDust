module Fayde.Data {
    export interface IDataErrorInfo {
        Error: string;
        GetError(propertyName: string): string;
    }
    export var IDataErrorInfo_ = new nullstone.Interface<IDataErrorInfo>("IDataErrorInfo");
}