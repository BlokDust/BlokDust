module Fayde.Controls.wrappanel.arrange.tapins {
    import Size = minerva.Size;
    import Rect = minerva.Rect;

    export function doHorizontal (input: IInput, state: IState, output: IOutput, tree: minerva.core.IUpdaterTree, finalRect: Rect): boolean {
        if (input.orientation !== Orientation.Horizontal)
            return true;

        var fs = state.finalSize;
        var as = state.arrangedSize;
        Size.copyTo(fs, as);

        var cr = state.childRect;
        cr.x = cr.y = cr.width = cr.height = 0;

        var rowHeight = 0;
        for (var walker = tree.walk(); walker.step();) {
            var child = walker.current;
            var childDesired = child.assets.desiredSize;
            if (fs.width < (cr.x + childDesired.width)) {  // needs to start another row
                cr.x = 0;  // reset offsetX to 0
                cr.y += rowHeight; //offsetY + lastrow height
                rowHeight = 0;  //reset row spacing
            }
            rowHeight = Math.max(rowHeight, childDesired.height);
            Size.copyTo(childDesired, cr);
            child.arrange(cr);
            cr.x += childDesired.width;
        }
        as.width = Math.max(as.width, fs.width);

        return true;
    }
}