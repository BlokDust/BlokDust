/// <reference path="../Markup/Loader" />

module Fayde {
    export class DataTemplate extends Markup.FrameworkTemplate {
        static DataTypeProperty = DependencyProperty.Register("DataType", () => IType_, DataTemplate);
        DataType: Function;
    }
    Fayde.CoreLibrary.add(DataTemplate);
}