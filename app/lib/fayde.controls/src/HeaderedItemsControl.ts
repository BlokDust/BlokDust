module Fayde.Controls {
    export class HeaderedItemsControl extends ItemsControl {
        private _HeaderIsItem: boolean = false;
        private _ItemsControlHelper: Internal.ItemsControlHelper;

        static HeaderProperty = DependencyProperty.Register("Header", () => Object, HeaderedItemsControl, undefined, (d: HeaderedItemsControl, args) => d.OnHeaderChanged(args.OldValue, args.NewValue));
        static HeaderTemplateProperty = DependencyProperty.Register("HeaderTemplate", () => DataTemplate, HeaderedItemsControl, undefined, (d: HeaderedItemsControl, args) => d.OnHeaderTemplateChanged(args.OldValue, args.NewValue));
        static ItemContainerStyleProperty = DependencyProperty.Register("ItemContainerStyle", () => Style, HeaderedItemsControl, undefined, (d: HeaderedItemsControl, args) => d.OnItemContainerStyleChanged(args));
        Header: any;
        HeaderTemplate: DataTemplate;
        ItemContainerStyle: Style;

        OnHeaderChanged (oldHeader: any, newHeader: any) {
        }

        OnHeaderTemplateChanged (oldHeaderTemplate: DataTemplate, newHeaderTemplate: DataTemplate) {
        }

        private OnItemContainerStyleChanged (args: IDependencyPropertyChangedEventArgs) {
            this._ItemsControlHelper.UpdateItemContainerStyle(args.NewValue);
        }

        constructor () {
            super();
            this.DefaultStyleKey = HeaderedItemsControl;
            this._ItemsControlHelper = new Internal.ItemsControlHelper(this);
        }

        OnApplyTemplate () {
            super.OnApplyTemplate();
            this._ItemsControlHelper.OnApplyTemplate();
        }

        PrepareContainerForItem (element: UIElement, item: any) {
            var control = <Control>element;
            if (!(control instanceof Control)) control = null;

            var ics = this.ItemContainerStyle;
            if (ics != null && control != null && control.Style == null)
                control.SetValue(FrameworkElement.StyleProperty, ics);

            var hic = <HeaderedItemsControl>element;
            if (hic instanceof HeaderedItemsControl)
                HeaderedItemsControl.PrepareHeaderedItemsControlContainer(hic, item, this, ics);
            super.PrepareContainerForItem(element, item);
        }

        static PrepareHeaderedItemsControlContainer (control: HeaderedItemsControl, item: any, parentItemsControl: ItemsControl, parentItemContainerStyle: Style) {
            if (control === item)
                return;
            var itemTemplate = parentItemsControl.ItemTemplate;
            if (itemTemplate != null)
                control.SetValue(ItemsControl.ItemTemplateProperty, itemTemplate);
            if (parentItemContainerStyle != null && hasDefaultValue(control, HeaderedItemsControl.ItemContainerStyleProperty))
                control.SetValue(HeaderedItemsControl.ItemContainerStyleProperty, parentItemContainerStyle);
            if (control._HeaderIsItem || hasDefaultValue(control, HeaderedItemsControl.HeaderProperty)) {
                control.Header = item;
                control._HeaderIsItem = true;
            }
            if (itemTemplate != null)
                control.SetValue(HeaderedItemsControl.HeaderTemplateProperty, itemTemplate);
            if (parentItemContainerStyle != null && control.Style == null)
                control.SetValue(FrameworkElement.StyleProperty, parentItemContainerStyle);
            var hdt = <HierarchicalDataTemplate>itemTemplate;
            if (!(hdt instanceof HierarchicalDataTemplate))
                return;
            var isexpr = hdt.GetBindingExpression(HierarchicalDataTemplate.ItemsSourceProperty);
            if (isexpr) {
                var binding = new Data.Binding(isexpr.ParentBinding);
                binding.Source = control.Header;
                control.SetBinding(ItemsControl.ItemsSourceProperty, binding);
            }
            if (hdt.ItemTemplate !== undefined && control.ItemTemplate === itemTemplate) {
                control.ClearValue(ItemsControl.ItemTemplateProperty);
                if (hdt.ItemTemplate != null)
                    control.ItemTemplate = hdt.ItemTemplate;
            }
            if (hdt.ItemContainerStyle !== undefined && control.ItemContainerStyle === parentItemContainerStyle) {
                control.ClearValue(HeaderedItemsControl.ItemContainerStyleProperty);
                if (hdt.ItemContainerStyle != null)
                    control.ItemContainerStyle = hdt.ItemContainerStyle;
            }
        }
    }

    function hasDefaultValue (control: Control, propd: DependencyProperty): boolean {
        return control.ReadLocalValue(propd) === DependencyProperty.UnsetValue;
    }
}