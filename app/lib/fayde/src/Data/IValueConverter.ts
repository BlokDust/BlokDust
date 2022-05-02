module Fayde.Data {
    export interface IValueConverter {
        Convert(value: any, targetType: IType, parameter: any, culture: any): any;
        ConvertBack(value: any, targetType: IType, parameter: any, culture: any): any;
    }
    export var IValueConverter_ = new nullstone.Interface<IValueConverter>("IValueConverter");
}