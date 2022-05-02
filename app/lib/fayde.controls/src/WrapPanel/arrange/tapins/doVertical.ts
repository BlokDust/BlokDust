module Fayde.Controls.wrappanel.arrange.tapins {
    import Size = minerva.Size;
    import Rect = minerva.Rect;

    export function doVertical (input: IInput, state: IState, output: IOutput, tree: minerva.core.IUpdaterTree, finalRect: Rect): boolean {
        if (input.orientation !== Orientation.Vertical)
            return true;

        var fs = state.finalSize;
        var as = state.arrangedSize;
        Size.copyTo(fs, as);

        var cr = state.childRect;
        cr.x = cr.y = cr.width = cr.height = 0;

        var colWidth = 0;
        for (var walker = tree.walk(); walker.step();) {
            var child = walker.current;
            var childDesired = child.assets.desiredSize;
            if (fs.height < (cr.y + childDesired.height)) {  // needs to start another col
                cr.x += colWidth;   //and colWidth
                cr.y = 0;           //reset OffsetY to top
                colWidth = 0;          //reset colWidth
            }
            colWidth = Math.max(colWidth, childDesired.width);
            Size.copyTo(childDesired, cr);
            child.arrange(cr);
            cr.y += childDesired.height;
        }
        as.height = Math.max(as.height, fs.height);

        return true;
    }
}