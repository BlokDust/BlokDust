/// <reference path="Shape.ts" />

module Fayde.Shapes {
    import LineUpdater = minerva.shapes.line.LineUpdater;
    export class Line extends Shape {
        CreateLayoutUpdater () {
            return new LineUpdater();
        }

        static X1Property = DependencyProperty.Register("X1", () => Number, Line, 0.0);
        static Y1Property = DependencyProperty.Register("Y1", () => Number, Line, 0.0);
        static X2Property = DependencyProperty.Register("X2", () => Number, Line, 0.0);
        static Y2Property = DependencyProperty.Register("Y2", () => Number, Line, 0.0);
        X1: number;
        Y1: number;
        X2: number;
        Y2: number;
    }
    Fayde.CoreLibrary.add(Line);

    module reactions {
        UIReaction<number>(Line.X1Property, (upd: LineUpdater, ov, nv) => upd.invalidatePath(), false);
        UIReaction<number>(Line.Y1Property, (upd: LineUpdater, ov, nv) => upd.invalidatePath(), false);
        UIReaction<number>(Line.X2Property, (upd: LineUpdater, ov, nv) => upd.invalidatePath(), false);
        UIReaction<number>(Line.Y2Property, (upd: LineUpdater, ov, nv) => upd.invalidatePath(), false);
    }
}