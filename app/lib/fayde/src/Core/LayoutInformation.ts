module Fayde {
    export class LayoutInformation {
        static GetLayoutClip(uie: UIElement): Media.Geometry {
            var rect = new minerva.Rect();
            minerva.Rect.copyTo(uie.XamlNode.LayoutUpdater.assets.layoutClip, rect);
            var geom = new Media.RectangleGeometry();
            geom.Rect = rect;
            return geom;
        }

        /*
        static GetLayoutExceptionElement(): UIElement {
            var lu = LayoutUpdater.LayoutExceptionUpdater;
            if (lu)
                return lu.Node.XObject;
        }
        */

        static GetLayoutSlot(uie: UIElement): minerva.Rect {
            var rect = new minerva.Rect();
            minerva.Rect.copyTo(uie.XamlNode.LayoutUpdater.assets.layoutSlot, rect);
            return rect;
        }
    }
    Fayde.CoreLibrary.add(LayoutInformation);
}