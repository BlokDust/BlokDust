module minerva.controls.virtualizingstackpanel.arrange.tapins {
    export function doVertical (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean {
        if (input.orientation !== Orientation.Vertical)
            return true;

        var fs = state.finalSize;
        var arranged = state.arrangedSize;
        arranged.height = 0;
        var childRect = state.childRect;
        var sd = input.scrollData;

        var child: core.Updater;
        var childDesired: Size;
        for (var walker = tree.walk(); walker.step();) {
            child = walker.current;
            childDesired = child.assets.desiredSize;
            childDesired.width = fs.width;
            Size.copyTo(childDesired, childRect);
            childRect.x = -sd.offsetX;
            childRect.y = arranged.height;

            if (Rect.isEmpty(childRect))
                childRect.x = childRect.y = childRect.width = childRect.height = 0;
            child.arrange(childRect);

            arranged.width = Math.max(arranged.width, childDesired.width);
            arranged.height += childDesired.height;
        }

        arranged.height = Math.max(arranged.height, fs.height);

        return true;
    }
}