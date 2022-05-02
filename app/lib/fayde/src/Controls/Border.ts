/// <reference path="../Core/FrameworkElement.ts" />
/// <reference path="../Markup/ContentAnnotation.ts" />

module Fayde.Controls {
    export class Border extends FrameworkElement {
        CreateLayoutUpdater (): minerva.controls.border.BorderUpdater {
            return new minerva.controls.border.BorderUpdater();
        }

        static BackgroundProperty = DependencyProperty.RegisterCore("Background", () => Media.Brush, Border);
        static BorderBrushProperty = DependencyProperty.RegisterCore("BorderBrush", () => Media.Brush, Border);
        static BorderThicknessProperty = DependencyProperty.Register("BorderThickness", () => Thickness, Border); //TODO: Validator
        static ChildProperty = DependencyProperty.Register("Child", () => UIElement, Border);
        static CornerRadiusProperty = DependencyProperty.Register("CornerRadius", () => CornerRadius, Border); //TODO: Validator
        static PaddingProperty = DependencyProperty.Register("Padding", () => Thickness, Border); //TODO: Validator
        Background: Media.Brush;
        BorderBrush: Media.Brush;
        BorderThickness: minerva.Thickness;
        Child: UIElement;
        CornerRadius: CornerRadius;
        Padding: Thickness;

        constructor () {
            super();
            this.DefaultStyleKey = Border;
        }
    }
    Fayde.CoreLibrary.add(Border);
    Markup.Content(Border, Border.ChildProperty);

    UIReaction<minerva.IBrush>(Border.BackgroundProperty, (upd, ov, nv) => {
        upd.invalidate();
    });
    UIReaction<minerva.IBrush>(Border.BorderBrushProperty, (upd, ov, nv) => {
        upd.invalidate();
    });
    UIReaction<Thickness>(Border.BorderThicknessProperty, (upd, ov, nv) => upd.invalidateMeasure(), false, minerva.Thickness.copyTo);
    UIReaction<Thickness>(Border.PaddingProperty, (upd, ov, nv) => upd.invalidateMeasure(), false, minerva.Thickness.copyTo);
    UIReaction<minerva.CornerRadius>(Border.CornerRadiusProperty, (upd, ov, nv) => upd.invalidate(), false, minerva.CornerRadius.copyTo);
    UIReaction<UIElement>(Border.ChildProperty, (upd, ov, nv, border?: Border) => {
        var node = border.XamlNode;
        var error = new BError();
        if (ov instanceof UIElement)
            node.DetachVisualChild(ov, error);
        if (nv instanceof UIElement)
            node.AttachVisualChild(nv, error);
        if (error.Message)
            error.ThrowException();
        upd.updateBounds();
        upd.invalidateMeasure();
    }, false, false);
}