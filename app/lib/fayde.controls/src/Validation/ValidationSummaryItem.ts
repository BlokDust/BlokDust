module Fayde.Controls {
    import ObservableCollection = Collections.ObservableCollection;

    export class ValidationSummaryItem extends MVVM.ObservableObject {
        Message: string;
        MessageHeader: string;
        ItemType: ValidationSummaryItemType;
        Context: any;

        private _Sources: ObservableCollection<ValidationSummaryItemSource>;
        get Sources (): ObservableCollection<ValidationSummaryItemSource> {
            return this._Sources;
        }

        constructor (message?: string, messageHeader?: string, itemType?: ValidationSummaryItemType, source?: ValidationSummaryItemSource, context?: any) {
            super();
            this.Message = message || null;
            this.MessageHeader = messageHeader || null;
            this.ItemType = itemType || ValidationSummaryItemType.ObjectError;
            this._Sources = new ObservableCollection<ValidationSummaryItemSource>();
            if (source != null)
                this._Sources.Add(source);
            this.Context = context;
        }
    }
    Fayde.MVVM.NotifyProperties(ValidationSummaryItem, ["Message", "MessageHeader", "ItemType", "Context"]);
}