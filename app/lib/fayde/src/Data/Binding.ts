module Fayde.Data {
    import convert = nullstone.convertAnyToType;

    export var WarnBrokenPath = false;

    export class Binding implements nullstone.markup.IMarkupExtension, ICloneable {
        StringFormat: string;
        FallbackValue: any;
        TargetNullValue: any;
        BindsDirectlyToSource: boolean = false;
        Converter: IValueConverter;
        ConverterParameter: any;
        ConverterCulture: any;
        ElementName: string;
        Mode: BindingMode;
        NotifyOnValidationError: boolean = false;
        RelativeSource: RelativeSource;
        Path: Data.PropertyPath;
        Source: any;
        UpdateSourceTrigger: UpdateSourceTrigger;
        ValidatesOnExceptions: boolean = false;
        ValidatesOnDataErrors: boolean = false;
        ValidatesOnNotifyDataErrors: boolean = true;

        constructor ();
        constructor (path: string|Data.PropertyPath);
        constructor (binding: Binding);
        constructor (obj?: any) {
            if (obj instanceof Binding) {
                var binding = <Binding>obj;
                this.StringFormat = binding.StringFormat;
                this.FallbackValue = binding.FallbackValue;
                this.TargetNullValue = binding.TargetNullValue;
                this.BindsDirectlyToSource = binding.BindsDirectlyToSource;
                this.Converter = binding.Converter;
                this.ConverterParameter = binding.ConverterParameter;
                this.ConverterCulture = binding.ConverterCulture;
                this.ElementName = binding.ElementName;
                this.Mode = binding.Mode;
                this.NotifyOnValidationError = binding.NotifyOnValidationError;
                this.RelativeSource = binding.RelativeSource ? binding.RelativeSource.Clone() : null;
                this.Path = binding.Path;
                this.Source = binding.Source;
                this.UpdateSourceTrigger = binding.UpdateSourceTrigger;
                this.ValidatesOnExceptions = binding.ValidatesOnExceptions;
                this.ValidatesOnDataErrors = binding.ValidatesOnDataErrors;
                this.ValidatesOnNotifyDataErrors = binding.ValidatesOnNotifyDataErrors;
            } else if (typeof obj === "string") {
                this.Path = new Data.PropertyPath(<string>obj);
            } else if (obj instanceof Data.PropertyPath) {
                this.Path = obj;
            } else {
                this.Path = new Data.PropertyPath("");
            }
        }

        init (val: string) {
            this.Path = new Data.PropertyPath(val);
        }

        transmute (os: any[]): any {
            this.$$coerce();
            Object.freeze(this);
            return new Data.BindingExpression(this);
        }

        private $$coerce () {
            this.StringFormat = this.StringFormat ? this.StringFormat.toString() : undefined;
            this.BindsDirectlyToSource = convert(this.BindsDirectlyToSource, Boolean) || false;
            this.Mode = Enum.fromAny(BindingMode, this.Mode);
            this.NotifyOnValidationError = convert(this.NotifyOnValidationError, Boolean) || false;
            this.Path = convert(this.Path, Data.PropertyPath);
            this.UpdateSourceTrigger = Enum.fromAny(UpdateSourceTrigger, this.UpdateSourceTrigger);
            this.ValidatesOnExceptions = convert(this.ValidatesOnExceptions, Boolean) || false;
            this.ValidatesOnDataErrors = convert(this.ValidatesOnDataErrors, Boolean) || false;
            this.ValidatesOnNotifyDataErrors = convert(this.ValidatesOnNotifyDataErrors, Boolean) !== false; //default: true
        }

        Clone () {
            return new Binding(this);
        }

        static fromData (data: IBindingData): Binding {
            var binding = new Binding(data.Path);
            binding.StringFormat = data.StringFormat;
            binding.FallbackValue = data.FallbackValue;
            binding.TargetNullValue = data.TargetNullValue;
            binding.BindsDirectlyToSource = data.BindsDirectlyToSource;
            binding.Converter = data.Converter;
            binding.ConverterParameter = data.ConverterParameter;
            binding.ConverterCulture = data.ConverterCulture;
            binding.ElementName = data.ElementName;
            binding.Mode = data.Mode;
            binding.NotifyOnValidationError = data.NotifyOnValidationError;
            binding.RelativeSource = data.RelativeSource;
            binding.Source = data.Source;
            binding.UpdateSourceTrigger = data.UpdateSourceTrigger;
            binding.ValidatesOnExceptions = data.ValidatesOnExceptions;
            binding.ValidatesOnDataErrors = data.ValidatesOnDataErrors;
            binding.ValidatesOnNotifyDataErrors = data.ValidatesOnNotifyDataErrors;
            return binding;
        }
    }
    Fayde.CoreLibrary.add(Binding);
}