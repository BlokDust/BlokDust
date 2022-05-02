/// <reference path="Primitives/ButtonBase.ts" />

module Fayde.Controls {
    type Target = string|Frame;

    export class HyperlinkButton extends Primitives.ButtonBase {
        static NavigateUriProperty = DependencyProperty.Register("NavigateUri", () => Uri, HyperlinkButton);
        static TargetNameProperty = DependencyProperty.Register("TargetName", () => String, HyperlinkButton);
        NavigateUri: Uri;
        TargetName: string;

        constructor() {
            super();
            this.DefaultStyleKey = HyperlinkButton;
        }

        OnApplyTemplate() {
            super.OnApplyTemplate();
            this.UpdateVisualState(false);
        }

        OnClick() {
            super.OnClick();
            var navUri = this.NavigateUri;
            if (navUri)
                Navigation.Navigate(this, this.TargetName, navUri);
        }
    }
    Fayde.CoreLibrary.add(HyperlinkButton);
    TemplateVisualStates(HyperlinkButton,
        {GroupName: "CommonStates", Name: "Normal"},
        {GroupName: "CommonStates", Name: "MouseOver"},
        {GroupName: "CommonStates", Name: "Pressed"},
        {GroupName: "CommonStates", Name: "Disabled"},
        {GroupName: "FocusStates", Name: "Unfocused"},
        {GroupName: "FocusStates", Name: "Focused"});
}