module minerva.controls.canvas.arrange.tapins {
    export function doOverride (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean {
        var cr = state.childRect;
        var child: core.Updater;
        for (var walker = tree.walk(); walker.step();) {
            child = walker.current;
            Size.copyTo(child.assets.desiredSize, cr);
            //NOTE: Coercing undefined, null, NaN, and 0 to 0
            cr.x = child.getAttachedValue("Canvas.Left") || 0;
            cr.y = child.getAttachedValue("Canvas.Top") || 0;
            child.arrange(cr);
        }
        Size.copyTo(state.finalSize, state.arrangedSize);
        return true;
    }
}