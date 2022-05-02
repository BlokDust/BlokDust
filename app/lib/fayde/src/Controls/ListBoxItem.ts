/// <reference path="ContentControl.ts" />

module Fayde.Controls {
    export class ListBoxItem extends ContentControl {
        private _ParentSelector: Primitives.Selector;
        get ParentSelector(): Primitives.Selector { return this._ParentSelector; }
        set ParentSelector(value: Primitives.Selector) {
            if (this._ParentSelector === value)
                return;
            this._ParentSelector = value;
            this.ParentSelectorChanged.raise(this, null);
        }
        ParentSelectorChanged = new nullstone.Event();

        static IsSelectedProperty: DependencyProperty = DependencyProperty.RegisterCore("IsSelected", () => Boolean, ListBoxItem, null, (d, args) => (<ListBoxItem>d).OnIsSelectedChanged(args));
        IsSelected: boolean;

        constructor() {
            super();
            this.DefaultStyleKey = ListBoxItem;
        }

        OnApplyTemplate() {
            super.OnApplyTemplate();
            this.UpdateVisualState(false);
        }

        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs) {
            if (e.Handled)
                return;
            e.Handled = true;
            if (!this.XamlNode.Focus(true))
                return;
            if (this._ParentSelector != null)
                this._ParentSelector.NotifyListItemClicked(this);
        }
        OnMouseEnter(e: Input.MouseEventArgs) {
            super.OnMouseEnter(e);
            this.UpdateVisualState();
        }
        OnMouseLeave(e: Input.MouseEventArgs) {
            super.OnMouseLeave(e);
            this.UpdateVisualState();
        }
        OnGotFocus(e: RoutedEventArgs) {
            super.OnGotFocus(e);
            this.UpdateVisualState();
            if (this._ParentSelector != null) {
                this._ParentSelector.NotifyListItemGotFocus(this);
            }
        }
        OnLostFocus(e: RoutedEventArgs) {
            super.OnLostFocus(e);
            this.UpdateVisualState();
            if (this._ParentSelector != null) {
                this._ParentSelector.NotifyListItemLostFocus(this);
            }
        }

        GoToStateSelection(gotoFunc: (state: string) => boolean): boolean {
            if (!this.IsSelected)
                return gotoFunc("Unselected");
            if (gotoFunc("SelectedUnfocused"))
                return true;
            return gotoFunc("Selected");
        }
        
        private OnIsSelectedChanged(args: IDependencyPropertyChangedEventArgs) {
            this.UpdateVisualState();
        }
    }
    Fayde.CoreLibrary.add(ListBoxItem);
    TemplateVisualStates(ListBoxItem, 
        { GroupName: "CommonStates", Name: "Normal" },
        { GroupName: "CommonStates", Name: "MouseOver" },
        { GroupName: "CommonStates", Name: "Disabled" },
        { GroupName: "FocusStates", Name: "Unfocused" },
        { GroupName: "FocusStates", Name: "Focused" },
        { GroupName: "SelectionStates", Name: "Unselected" },
        { GroupName: "SelectionStates", Name: "Selected" },
        { GroupName: "SelectionStates", Name: "SelectedUnfocused" });
}