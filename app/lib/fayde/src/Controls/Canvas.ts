/// <reference path="Panel.ts" />

module Fayde.Controls {
    export class Canvas extends Panel {
        CreateLayoutUpdater() { return new minerva.controls.canvas.CanvasUpdater(); }

        static TopProperty: DependencyProperty = DependencyProperty.RegisterAttached("Top", () => Number, Canvas, 0.0);
        static GetTop(d: DependencyObject): number { return d.GetValue(Canvas.TopProperty); }
        static SetTop(d: DependencyObject, value: number) { d.SetValue(Canvas.TopProperty, value); }
        static LeftProperty: DependencyProperty = DependencyProperty.RegisterAttached("Left", () => Number, Canvas, 0.0);
        static GetLeft(d: DependencyObject): number { return d.GetValue(Canvas.LeftProperty); }
        static SetLeft(d: DependencyObject, value: number) { d.SetValue(Canvas.LeftProperty, value); }
    }
    Fayde.CoreLibrary.add(Canvas);

    module reactions {
        UIReactionAttached<number>(Canvas.TopProperty, minerva.controls.canvas.reactTo.top);
        UIReactionAttached<number>(Canvas.LeftProperty, minerva.controls.canvas.reactTo.left);
    }
}