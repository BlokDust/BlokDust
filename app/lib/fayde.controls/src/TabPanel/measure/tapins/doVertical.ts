module Fayde.Controls.tabpanel.measure.tapins {
    export function doVertical (input: IInput, state: IState, output: IOutput, tree: minerva.core.IUpdaterTree, availableSize: minerva.Size): boolean {
        if (input.tabAlignment !== Dock.Left && input.tabAlignment !== Dock.Right)
            return true;

        var ds = output.desiredSize;
        ds.width = ds.height = 0;
        output.numRows = 1;
        output.numHeaders = 0;
        output.rowHeight = 0.0;

        for (var walker = tree.walk(); walker.step();) {
            var child = walker.current;
            if (child.assets.visibility === minerva.Visibility.Collapsed)
                break;
            output.numHeaders++;
            child.measure(state.availableSize);

            var sizeWithoutMargin = helpers.getDesiredSizeWithoutMargin(child);
            if (ds.width < sizeWithoutMargin.width)
                ds.width = sizeWithoutMargin.width;
            ds.height += sizeWithoutMargin.height;
        }

        return true;
    }
}