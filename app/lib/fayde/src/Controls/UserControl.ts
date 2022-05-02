/// <reference path="Control.ts" />

module Fayde.Controls {
    export class UserControl extends Control {
        static ContentProperty: DependencyProperty = DependencyProperty.Register("Content", () => UIElement, UserControl);
        Content: UIElement;

        CreateLayoutUpdater () {
            return new minerva.controls.usercontrol.UserControlUpdater();
        }

        InitializeComponent () {
            this.ApplyTemplate();
        }

        constructor() {
            super();
            this.DefaultStyleKey = UserControl;
        }
    }
    Fayde.CoreLibrary.add(UserControl);
    Markup.Content(UserControl, UserControl.ContentProperty);

    module reactions {
        UIReaction<UIElement>(UserControl.ContentProperty, (updater, ov, nv, uc?: UserControl) => {
            var error = new BError();
            if (ov instanceof UIElement)
                uc.XamlNode.DetachVisualChild(ov, error);
            if (nv instanceof UIElement)
                uc.XamlNode.AttachVisualChild(nv, error);
            if (error.Message)
                error.ThrowException();
            updater.updateBounds();
        }, false, false);
    }
}