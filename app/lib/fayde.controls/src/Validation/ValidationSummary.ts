module Fayde.Controls {
    import ObservableCollection = Fayde.Collections.ObservableCollection;
    import ReadOnlyObservableCollection = Fayde.Collections.ReadOnlyObservableCollection;

    export class ValidationSummary extends Control {
        static ShowErrorsInSummaryProperty = DependencyProperty.RegisterAttached("ShowErrorsInSummary", () => Boolean, ValidationSummary, true, ValidationSummary.OnShowErrorsInSummaryChanged);
        static ErrorStyleProperty = DependencyProperty.Register("ErrorStyle", () => Style, ValidationSummary);
        static FilterProperty = DependencyProperty.Register("Filter", () => new Enum(ValidationSummaryFilters), ValidationSummary, ValidationSummaryFilters.All, (d: ValidationSummary, args) => d.OnFilterChanged(args.OldValue, args.NewValue));
        static FocusControlsOnClickProperty = DependencyProperty.Register("FocusControlsOnClick", () => Boolean, ValidationSummary, true);
        static HasErrorsProperty = DependencyProperty.RegisterReadOnly("HasErrors", () => Boolean, ValidationSummary, false);
        static HasDisplayedErrorsProperty = DependencyProperty.RegisterReadOnly("HasDisplayedErrors", () => Boolean, ValidationSummary, false);
        static HeaderProperty = DependencyProperty.Register("Header", () => Object, ValidationSummary, undefined, (d: ValidationSummary, args) => d.OnHeaderChanged(args.OldValue, args.NewValue));
        static HeaderTemplateProperty = DependencyProperty.Register("HeaderTemplate", () => DataTemplate, ValidationSummary);
        static SummaryListBoxStyleProperty = DependencyProperty.Register("SummaryListBoxStyle", () => Style, ValidationSummary);
        static TargetProperty = DependencyProperty.Register("Target", () => UIElement, ValidationSummary, undefined, (d: ValidationSummary, args) => d.OnTargetChanged(args.OldValue, args.NewValue));

        static GetShowErrorsInSummary (dobj: DependencyObject): boolean {
            return dobj.GetValue(ValidationSummary.ShowErrorsInSummaryProperty) === true;
        }

        static SetShowErrorsInSummary (dobj: DependencyObject, value: boolean) {
            dobj.SetValue(ValidationSummary.ShowErrorsInSummaryProperty, value === true);
        }

        ShowErrorsInSummary: boolean;
        ErrorStyle: Style;
        Filter: ValidationSummaryFilters;
        FocusControlsOnClick: boolean;
        HasErrors: boolean;
        HasDisplayedErrors: boolean;
        Header: any;
        HeaderTemplate: DataTemplate;
        SummaryListBoxStyle: Style;
        Target: UIElement;

        private static OnShowErrorsInSummaryChanged (dobj: DependencyObject, args: IDependencyPropertyChangedEventArgs) {
            var root = VisualTreeHelper.GetRoot(dobj);
            if (root)
                ValidationSummary.UpdateDisplayedErrorsOnAllValidationSummaries(root);
        }

        OnFilterChanged (oldValue: ValidationSummaryFilters, newValue: ValidationSummaryFilters) {
            this.UpdateDisplayedErrors();
        }

        OnHeaderChanged (oldValue: any, newValue: any) {
            this.UpdateHeaderText();
        }

        OnTargetChanged (oldValue: UIElement, newValue: UIElement) {
            if (this._RegisteredParent != null) {
                this._RegisteredParent.BindingValidationError.off(this.Target_BindingValidationError, this);
                this._RegisteredParent = null;
            }
            if (oldValue instanceof FrameworkElement)
                (<FrameworkElement>oldValue).BindingValidationError.off(this.Target_BindingValidationError, this);
            if (newValue instanceof FrameworkElement)
                (<FrameworkElement>newValue).BindingValidationError.on(this.Target_BindingValidationError, this);
            this._Errors.ClearErrors(ValidationSummaryItemType.PropertyError);
            this.UpdateDisplayedErrors();
        }

        private _ErrorsListBox: ListBox = null;
        private _HeaderContentControl: ContentControl = null;
        private _RegisteredParent: FrameworkElement;
        private _ValidationSummaryItemDictionary = {};
        private _CurSummItemsSource: ValidationSummaryItemSource;

        private _Errors = new ValidationItemCollection();
        get Errors (): ObservableCollection<ValidationSummaryItem> {
            return this._Errors;
        }

        private _DisplayedErrors = new ValidationItemCollection();
        get DisplayedErrors (): ReadOnlyObservableCollection<ValidationSummaryItem> {
            return new ReadOnlyObservableCollection<ValidationSummaryItem>(this._DisplayedErrors);
        }

        FocusingInvalidControl = new nullstone.Event<FocusingInvalidControlEventArgs>();
        SelectionChanged = new nullstone.Event<Primitives.SelectionChangedEventArgs>();

        constructor () {
            super();
            this.DefaultStyleKey = ValidationSummary;

            this._Errors.CollectionChanged.on(this.Errors_CollectionChanged, this);

            this.Loaded.on(this.ValidationSummary_Loaded, this);
            this.Unloaded.on(this.ValidationSummary_Unloaded, this);
            this.IsEnabledChanged.on(this.ValidationSummary_IsEnabledChanged, this);
        }

        OnApplyTemplate () {
            super.OnApplyTemplate();
            if (this._ErrorsListBox != null) {
                this._ErrorsListBox.MouseLeftButtonUp.off(this.ErrorsListBox_MouseLeftButtonUp, this);
                this._ErrorsListBox.KeyDown.off(this.ErrorsListBox_KeyDown, this);
                this._ErrorsListBox.SelectionChanged.off(this.ErrorsListBox_SelectionChanged, this);
            }
            this._ErrorsListBox = <ListBox>this.GetTemplateChild("SummaryListBox", ListBox);
            if (this._ErrorsListBox != null) {
                this._ErrorsListBox.MouseLeftButtonUp.on(this.ErrorsListBox_MouseLeftButtonUp, this);
                this._ErrorsListBox.KeyDown.on(this.ErrorsListBox_KeyDown, this);
                this._ErrorsListBox.ItemsSource = this.DisplayedErrors;
                this._ErrorsListBox.SelectionChanged.on(this.ErrorsListBox_SelectionChanged, this);
            }
            this._HeaderContentControl = <ContentControl>this.GetTemplateChild("HeaderContentControl", ContentControl);
            this.UpdateDisplayedErrors();
            this.UpdateCommon(false);
            this.UpdateValidation(false);
        }

        private Errors_CollectionChanged (sender: any, e: Fayde.Collections.CollectionChangedEventArgs) {
            if (e.OldItems != null) {
                for (var i = 0, items = e.OldItems; i < items.length; i++) {
                    var item = items[i];
                    if (item)
                        item.PropertyChanged.off(this.ValidationSummaryItem_PropertyChanged, this);
                }
            }
            if (e.NewItems != null) {
                for (var i = 0, items = e.NewItems; i < items.length; i++) {
                    var item = items[i];
                    if (item)
                        item.PropertyChanged.on(this.ValidationSummaryItem_PropertyChanged, this);
                }
            }
            this.SetCurrentValue(ValidationSummary.HasErrorsProperty, this._Errors.Count > 0);
            this.UpdateDisplayedErrors();
        }

        private ErrorsListBox_KeyDown (sender: any, e: Input.KeyEventArgs) {
            if (e.Key !== Input.Key.Enter)
                return;
            this.ExecuteClick(sender);
        }

        private ErrorsListBox_MouseLeftButtonUp (sender, e: Input.MouseButtonEventArgs) {
            this.ExecuteClick(sender);
        }

        private ErrorsListBox_SelectionChanged (sender: any, e: Primitives.SelectionChangedEventArgs) {
            this.SelectionChanged.raise(this, e);
        }

        private ValidationSummary_Loaded (sender: any, e: RoutedEventArgs) {
            if (!this.Target && !this._RegisteredParent) {
                var rp = VisualTreeHelper.GetParent(this);
                this._RegisteredParent = rp instanceof FrameworkElement ? <FrameworkElement>rp : null;
                if (this._RegisteredParent != null)
                    this._RegisteredParent.BindingValidationError.on(this.Target_BindingValidationError, this);
            }
            this.Loaded.off(this.ValidationSummary_Loaded, this);
            //this._initialized = true;
        }

        private ValidationSummary_Unloaded (sender: any, e: RoutedEventArgs) {
            if (this._RegisteredParent != null)
                this._RegisteredParent.BindingValidationError.off(this.Target_BindingValidationError, this);
            this.Unloaded.off(this.ValidationSummary_Unloaded, this);
            //this._initialized = false;
        }

        private ValidationSummary_IsEnabledChanged (sender: any, e: DependencyPropertyChangedEventArgs) {
            this.UpdateCommon(true);
        }

        private ValidationSummaryItem_PropertyChanged (sender: any, e: PropertyChangedEventArgs) {
            if (!(e.PropertyName === "ItemType"))
                return;
            this.UpdateDisplayedErrors();
        }

        private UpdateValidation (useTransitions: boolean) {
            var gotoFunc = (state: string) => Media.VSM.VisualStateManager.GoToState(this, state, useTransitions);
            if (this._DisplayedErrors.Count > 0) {
                this.SetCurrentValue(ValidationSummary.HasDisplayedErrorsProperty, true);
                gotoFunc("HasErrors");
            } else {
                this.SetCurrentValue(ValidationSummary.HasDisplayedErrorsProperty, false);
                gotoFunc("Empty");
            }
        }

        private UpdateCommon (useTransitions: boolean) {
            var gotoFunc = (state: string) => Media.VSM.VisualStateManager.GoToState(this, state, useTransitions);
            if (this.IsEnabled)
                gotoFunc("Normal");
            else
                gotoFunc("Disabled");
        }

        private UpdateHeaderText () {
            var hcc = this._HeaderContentControl;
            if (!hcc)
                return;
            hcc.Content = (this.Header != null) ? this.Header : this.GetHeaderString();
        }

        private UpdateDisplayedErrors () {
            var showoe = (this.Filter & ValidationSummaryFilters.ObjectErrors) !== ValidationSummaryFilters.None;
            var showpe = (this.Filter & ValidationSummaryFilters.PropertyErrors) !== ValidationSummaryFilters.None;

            var arr: ValidationSummaryItem[] = [];
            for (var en = this.Errors.getEnumerator(); en.moveNext();) {
                var item = en.current;
                if (!item)
                    continue;
                if (showoe && item.ItemType === ValidationSummaryItemType.ObjectError)
                    arr.push(item);
                else if (showpe && item.ItemType === ValidationSummaryItemType.PropertyError)
                    arr.push(item);
            }
            arr.sort(compareSummaryItems);
            this._DisplayedErrors.Clear();
            this._DisplayedErrors.AddRange(arr);
            this.UpdateValidation(true);
            this.UpdateHeaderText();
        }

        private Target_BindingValidationError (sender: any, e: Validation.ValidationErrorEventArgs) {
            var element = <FrameworkElement>e.OriginalSource;
            if (!e || !e.Error || (e.Error.ErrorContent == null || !(element instanceof FrameworkElement)))
                return;
            var message = e.Error.ErrorContent.toString();
            var key = (element.Name || ((<any>element)._ID).toString()) + message;
            var dict = this._ValidationSummaryItemDictionary;
            if (e.Action === Validation.ValidationErrorEventAction.Added) {
                if (ValidationSummary.GetShowErrorsInSummary(element) === false)
                    return;
                var caption = e.Error.PropertyName;
                var item = new ValidationSummaryItem(message, caption, ValidationSummaryItemType.PropertyError, new ValidationSummaryItemSource(caption, <Control>element), null);
                this._Errors.Add(item);
                dict[key] = item;
            } else if (e.Action === Validation.ValidationErrorEventAction.Removed) {
                if (dict[key]) {
                    this._Errors.Remove(dict[key]);
                    dict[key] = undefined;
                }
            }
        }

        private GetHeaderString (): string {
            var count = this._DisplayedErrors.Count;
            if (count === 1)
                return "1 Error";
            return count.toString() + " Errors";
        }

        private ExecuteClick (sender: any) {
            var lb = <ListBox>sender;
            if (!(lb instanceof ListBox))
                return;
            var item = <ValidationSummaryItem>lb.SelectedItem;
            if (!(item instanceof ValidationSummaryItem) || !this.FocusControlsOnClick)
                return;
            if (item.Sources.Count === 0)
                this._CurSummItemsSource = null;
            else if (ValidationSummary.FindMatchingErrorSource(item.Sources, this._CurSummItemsSource) < 0)
                this._CurSummItemsSource = item.Sources.GetValueAt(0);
            var e = new FocusingInvalidControlEventArgs(item, this._CurSummItemsSource);
            this.FocusingInvalidControl.raise(this, e);
            if (!e.Handled && e.Target != null && e.Target.Control != null)
                e.Target.Control.Focus();
            if (item.Sources.Count <= 0)
                return;
            var matchingErrorSource = ValidationSummary.FindMatchingErrorSource(item.Sources, e.Target);
            var index = matchingErrorSource < 0 ? 0 : (matchingErrorSource + 1) % item.Sources.Count;
            this._CurSummItemsSource = item.Sources.GetValueAt(index);
        }

        private static FindMatchingErrorSource (sources: nullstone.ICollection<ValidationSummaryItemSource>, sourceToFind: ValidationSummaryItemSource): number {
            if (!sources)
                return -1;
            for (var i = 0; i < sources.Count; i++) {
                if (sources.GetValueAt(i).Equals(sourceToFind))
                    return i;
            }
            return -1;
        }

        private static UpdateDisplayedErrorsOnAllValidationSummaries (parent: DependencyObject) {
            if (!parent)
                return;
            if (parent instanceof  ValidationSummary) {
                (<ValidationSummary>parent).UpdateDisplayedErrors();
            } else {
                for (var i = 0, count = VisualTreeHelper.GetChildrenCount(parent); i < count; i++) {
                    ValidationSummary.UpdateDisplayedErrorsOnAllValidationSummaries(VisualTreeHelper.GetChild(parent, i));
                }
            }
        }
    }

    TemplateVisualStates(ValidationSummary,
        {GroupName: "CommonStates", Name: "Normal"},
        {GroupName: "CommonStates", Name: "Disabled"},
        {GroupName: "ValidationStates", Name: "HasErrors"},
        {GroupName: "ValidationStates", Name: "Empty"});
    TemplateParts(ValidationSummary,
        {Name: "SummaryListBox", Type: ListBox});

    class ValidationItemCollection extends ObservableCollection<ValidationSummaryItem> {
        ClearErrors (errorType: ValidationSummaryItemType) {
            var toremove: ValidationSummaryItem[] = [];
            for (var en = this.getEnumerator(); en.moveNext();) {
                if (en.current != null && en.current.ItemType === errorType)
                    toremove.push(en.current);
            }
            for (var i = 0; i < toremove.length; i++) {
                this.Remove(toremove[i]);
            }
        }

        ClearItems () {
            while (this.Count > 0) {
                this.RemoveAt(0);
            }
        }
    }
}