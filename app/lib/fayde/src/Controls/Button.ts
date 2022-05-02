/// <reference path="Primitives/ButtonBase.ts" />

module Fayde.Controls {
    export class Button extends Primitives.ButtonBase {
        constructor() {
            super();
            this.DefaultStyleKey = Button;
        }

        OnApplyTemplate() {
            super.OnApplyTemplate();
            this.UpdateVisualState(false);
        }

        OnIsEnabledChanged(e: IDependencyPropertyChangedEventArgs) {
            super.OnIsEnabledChanged(e);
            this.IsTabStop = e.NewValue;
        }
    }
    Fayde.CoreLibrary.add(Button);
    TemplateVisualStates(Button, 
        { GroupName: "CommonStates", Name: "Normal" },
        { GroupName: "CommonStates", Name: "MouseOver" },
        { GroupName: "CommonStates", Name: "Pressed" },
        { GroupName: "CommonStates", Name: "Disabled" },
        { GroupName: "FocusStates", Name: "Unfocused" },
        { GroupName: "FocusStates", Name: "Focused" });
}