module Fayde.Controls {
    export class Viewbox extends FrameworkElement {
        CreateLayoutUpdater () {
            return new viewbox.ViewboxUpdater();
        }

        static ChildProperty = DependencyProperty.Register("Child", () => UIElement, Viewbox);
        static StretchProperty = DependencyProperty.Register("Stretch", () => new Enum(Media.Stretch), Viewbox, undefined, (d: Viewbox, args) => d.InvalidateMeasure());
        static StretchDirectionProperty = DependencyProperty.Register("StretchDirection", () => new Enum(StretchDirection), Viewbox, undefined, (d: Viewbox, args) => d.InvalidateMeasure());
        Child: UIElement;
        Stretch: Media.Stretch;
        StretchDirection: StretchDirection;
    }
    Markup.Content(Viewbox, Viewbox.ChildProperty);

    module reactions {
        UIReaction<Media.Stretch>(Viewbox.StretchProperty, (updater, ov, nv) => updater.invalidateMeasure(), false);
        UIReaction<StretchDirection>(Viewbox.StretchDirectionProperty, (updater, ov, nv) => updater.invalidateMeasure(), false);
        UIReaction<UIElement>(Viewbox.ChildProperty, (upd, ov, nv, viewbox?: Viewbox) => {
            var node = viewbox.XamlNode;
            var error = new BError();
            if (ov instanceof Fayde.UIElement)
                node.DetachVisualChild(ov, error);
            if (nv instanceof Fayde.UIElement)
                node.AttachVisualChild(nv, error);
            if (error.Message)
                error.ThrowException();
            upd.updateBounds();
            upd.invalidateMeasure();
        }, false, false);
    }
}