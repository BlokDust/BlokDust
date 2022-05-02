
module Fayde.Controls.Primitives {
    export class MenuBase extends Fayde.Controls.ItemsControl {
        static ItemContainerStyleProperty = DependencyProperty.Register("ItemContainerStyle", () => Style, MenuBase);
        ItemContainerStyle: Style;

        IsItemItsOwnContainer(item: any): boolean { return item instanceof MenuItem || item instanceof Separator; }
        GetContainerForItem(): UIElement { return new MenuItem(); }
        PrepareContainerForItem(element: UIElement, item: any) {
            super.PrepareContainerForItem(element, item);
            var menuItem = <MenuItem>element;
            if (!(menuItem instanceof MenuItem))
                return;
            menuItem.ParentMenuBase = this;
            if (menuItem != item) {
                var itemTemplate = this.ItemTemplate;
                var itemContainerStyle = this.ItemContainerStyle;
                if (itemTemplate != null)
                    menuItem.SetValue(Fayde.Controls.ItemsControl.ItemTemplateProperty, itemTemplate);
                if (itemContainerStyle != null && MenuBase.HasDefaultValue(menuItem, Controls.HeaderedItemsControl.ItemContainerStyleProperty))
                    menuItem.SetValue(Controls.HeaderedItemsControl.ItemContainerStyleProperty, itemContainerStyle);
                if (MenuBase.HasDefaultValue(menuItem, Controls.HeaderedItemsControl.HeaderProperty))
                    menuItem.Header = item;
                if (itemTemplate != null)
                    menuItem.SetValue(Controls.HeaderedItemsControl.HeaderTemplateProperty, itemTemplate);
                if (itemContainerStyle != null)
                    menuItem.SetValue(FrameworkElement.StyleProperty, itemContainerStyle);
            }
        }
        private static HasDefaultValue(control: Control, propd: DependencyProperty): boolean {
            return control.ReadLocalValue(propd) === DependencyProperty.UnsetValue;
        }
    }
}