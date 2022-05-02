module Fayde.Controls {
    export class WrapPanel extends Fayde.Controls.Panel {
        CreateLayoutUpdater () {
            return new wrappanel.WrapPanelUpdater();
        }

        static OrientationProperty = DependencyProperty.Register("Orientation", () => new Enum(Orientation), WrapPanel, Orientation.Horizontal);
        static ItemWidthProperty = DependencyProperty.Register("ItemWidth", () => Number, WrapPanel, NaN);
        static ItemHeightProperty = DependencyProperty.Register("ItemHeight", () => Number, WrapPanel, NaN);
        Orientation: Fayde.Orientation;
        ItemWidth: number;
        ItemHeight: number;
    }

    module reactions {
        UIReaction<Orientation>(WrapPanel.OrientationProperty, (upd, ov, nv) => upd.invalidateMeasure(), false);
        UIReaction<number>(WrapPanel.ItemWidthProperty, (upd, ov, nv) => upd.invalidateMeasure(), false);
        UIReaction<number>(WrapPanel.ItemHeightProperty, (upd, ov, nv) => upd.invalidateMeasure(), false);
    }
}
