module Fayde.Controls.tabpanel.arrange.tapins {
    export function doVertical (input: IInput, state: IState, output: IOutput, tree: minerva.core.IUpdaterTree, finalRect: minerva.Rect): boolean {
        if (input.tabAlignment !== Dock.Left && input.tabAlignment !== Dock.Right)
            return true;

        var cr = state.childRect;
        cr.x = cr.y = 0;
        cr.width = state.finalSize.width;
        for (var walker = tree.walk(); walker.step();) {
            var child = walker.current;
            if (child.assets.visibility === minerva.Visibility.Collapsed)
                continue;
            helpers.setTabItemZ(child);
            var sizeWithoutMargin = helpers.getDesiredSizeWithoutMargin(child);
            cr.height = sizeWithoutMargin.height;
            child.arrange(cr);
            cr.y += sizeWithoutMargin.height;
        }

        return true;
    }
}