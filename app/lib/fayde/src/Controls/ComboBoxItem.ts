/// <reference path="ListBoxItem.ts" />

module Fayde.Controls {
    export class ComboBoxItem extends ListBoxItem {
        constructor() {
            super();
            this.DefaultStyleKey = ComboBoxItem;
        }

        OnMouseLeftButtonUp(e: Input.MouseButtonEventArgs) {
            super.OnMouseLeftButtonUp(e);
            if (this.ParentSelector instanceof ComboBox)
                (<ComboBox>this.ParentSelector).IsDropDownOpen = false;
        }
    }
    Fayde.CoreLibrary.add(ComboBoxItem);
    TemplateVisualStates(ComboBoxItem, 
        { GroupName: "CommonStates", Name: "Normal" },
        { GroupName: "CommonStates", Name: "MouseOver" },
        { GroupName: "FocusStates", Name: "Unfocused" },
        { GroupName: "FocusStates", Name: "Focused" },
        { GroupName: "SelectionStates", Name: "Unselected" },
        { GroupName: "SelectionStates", Name: "Selected" },
        { GroupName: "SelectionStates", Name: "SelectedUnfocused" });
}