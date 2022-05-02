module minerva.controls.stackpanel.arrange.tapins {
    export function doHorizontal (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean {
        if (input.orientation !== Orientation.Horizontal)
            return true;

        var fs = state.finalSize;
        var arranged = state.arrangedSize;
        arranged.width = 0;
        var childRect = state.childRect;

        var child: core.Updater;
        var childDesired: Size;
        for (var walker = tree.walk(); walker.step();) {
            child = walker.current;
            childDesired = child.assets.desiredSize;
            childDesired.height = fs.height;
            Size.copyTo(childDesired, childRect);
            childRect.x = arranged.width;

            if (Rect.isEmpty(childRect))
                childRect.x = childRect.y = childRect.width = childRect.height = 0;
            child.arrange(childRect);

            arranged.width += childDesired.width;
            arranged.height = Math.max(arranged.height, childDesired.height);
        }

        arranged.width = Math.max(arranged.width, state.finalSize.width);

        return true;
    }
}