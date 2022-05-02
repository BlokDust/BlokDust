module minerva.shapes.shape.measure.tapins {
    export function calcNaturalBounds (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree) {
        var nb = output.naturalBounds;
        nb.x = nb.y = 0;
        nb.width = nb.height = 1;
        return true;
    }
}