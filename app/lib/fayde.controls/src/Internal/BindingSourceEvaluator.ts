
module Fayde.Controls.Internal {
    export class BindingSourceEvaluator<T> extends FrameworkElement {
        static ValueProperty = DependencyProperty.Register("Value", () => Object, BindingSourceEvaluator);
        Value: T;

        private _ValueBinding: Data.Binding = null;
        get ValueBinding(): Data.Binding { return this._ValueBinding; }

        constructor(binding:Data.Binding) {
            super();
            this._ValueBinding = binding;
        }

        GetDynamicValue(source: any): T {
            var vb = this._ValueBinding;

            var binding1 = new Data.Binding();
            binding1.BindsDirectlyToSource = vb.BindsDirectlyToSource;
            binding1.Converter = vb.Converter;
            binding1.ConverterCulture = vb.ConverterCulture;
            binding1.ConverterParameter = vb.ConverterParameter;
            binding1.FallbackValue = vb.FallbackValue;
            binding1.Mode = vb.Mode;
            binding1.NotifyOnValidationError = vb.NotifyOnValidationError;
            binding1.Path = vb.Path;
            binding1.StringFormat = vb.StringFormat;
            binding1.TargetNullValue = vb.TargetNullValue;
            binding1.UpdateSourceTrigger = vb.UpdateSourceTrigger;
            binding1.ValidatesOnDataErrors = vb.ValidatesOnDataErrors;
            binding1.ValidatesOnExceptions = vb.ValidatesOnExceptions;
            binding1.ValidatesOnNotifyDataErrors = vb.ValidatesOnNotifyDataErrors;
            binding1.Source = source;
            
            this.SetBinding(BindingSourceEvaluator.ValueProperty, binding1);
            var obj = <T>this.Value;
            this.ClearValue(BindingSourceEvaluator.ValueProperty);
            return obj;
        }
    }
}