/// <reference path="Panel.ts" />

module Fayde.Controls {
    export class StackPanel extends Panel {
        CreateLayoutUpdater () {
            return new minerva.controls.stackpanel.StackPanelUpdater();
        }

        static OrientationProperty: DependencyProperty = DependencyProperty.Register("Orientation", () => new Enum(Orientation), StackPanel, Orientation.Vertical);
        Orientation: Orientation;
    }
    Fayde.CoreLibrary.add(StackPanel);

    module reactions {
        UIReaction<minerva.Orientation>(StackPanel.OrientationProperty, (upd, ov, nv) => {
            upd.invalidateMeasure();
            upd.invalidateArrange();
        }, false);
    }
}