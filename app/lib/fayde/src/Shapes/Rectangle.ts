/// <reference path="Shape.ts" />

module Fayde.Shapes {
    import RectangleUpdater = minerva.shapes.rectangle.RectangleUpdater;

    export class Rectangle extends Shape {
        CreateLayoutUpdater () {
            return new RectangleUpdater();
        }

        /* RadiusX/RadiusY Notes
         For the rectangle to have rounded corners, both the RadiusX and RadiusY properties must be nonzero.
         A value greater than or equal to zero and less than or equal to half the rectangle's width that describes the x-radius of the ellipse is used to round the corners of the rectangle.
         Values greater than half the rectangle's width are treated as though equal to half the rectangle's width. Negative values are treated as positive values.
         */
        static RadiusXProperty = DependencyProperty.Register("RadiusX", () => Number, Rectangle, 0.0);
        static RadiusYProperty = DependencyProperty.Register("RadiusY", () => Number, Rectangle, 0.0);
        RadiusX: number;
        RadiusY: number;

        constructor () {
            super();
            this.Stretch = Fayde.Media.Stretch.Fill;
        }
    }
    Fayde.CoreLibrary.add(Rectangle);

    module reactions {
        UIReaction<number>(Rectangle.RadiusXProperty, (upd, ov, nv) => upd.invalidate(), false);
        UIReaction<number>(Rectangle.RadiusYProperty, (upd, ov, nv) => upd.invalidate(), false);
    }
}