/// <reference path="Shape.ts" />

module Fayde.Shapes {
    import EllipseUpdater = minerva.shapes.ellipse.EllipseUpdater;

    export class Ellipse extends Shape {
        CreateLayoutUpdater () {
            return new EllipseUpdater();
        }

        constructor () {
            super();
            this.Stretch = Media.Stretch.Fill;
        }
    }
    Fayde.CoreLibrary.add(Ellipse);
}