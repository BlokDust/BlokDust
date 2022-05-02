/// <reference path="Shape.ts" />

module Fayde.Shapes {
    import PathUpdater = minerva.shapes.path.PathUpdater;
    export class Path extends Shape {
        CreateLayoutUpdater () { return new PathUpdater(); }

        private static _DataCoercer (dobj: DependencyObject, propd: DependencyProperty, value: any): any {
            if (typeof value === "string")
                return Media.ParseGeometry(value);
            return value;
        }

        // Path.Data Description: http://msdn.microsoft.com/en-us/library/system.windows.shapes.path.data(v=vs.95).aspx
        static DataProperty = DependencyProperty.RegisterFull("Data", () => Media.Geometry, Path, undefined, undefined, Path._DataCoercer, undefined, undefined, false);
        Data: Media.Geometry;
    }
    Fayde.CoreLibrary.add(Path);

    module reactions {
        UIReaction<Media.Geometry>(Path.DataProperty, (upd: PathUpdater, ov, nv) => upd.invalidateNaturalBounds());
    }
}