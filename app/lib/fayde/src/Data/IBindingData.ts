module Fayde.Data {
    export interface IBindingData {
        Path: string|Data.PropertyPath;
        StringFormat?: string;
        FallbackValue?: any;
        TargetNullValue?: any;
        BindsDirectlyToSource?: boolean;
        Converter?: IValueConverter;
        ConverterParameter?: any;
        ConverterCulture?: any;
        ElementName?: string;
        Mode?: BindingMode;
        NotifyOnValidationError?: boolean;
        RelativeSource?: RelativeSource;
        Source?: any;
        UpdateSourceTrigger?: UpdateSourceTrigger;
        ValidatesOnExceptions?: boolean;
        ValidatesOnDataErrors?: boolean;
        ValidatesOnNotifyDataErrors?: boolean;
    }
}