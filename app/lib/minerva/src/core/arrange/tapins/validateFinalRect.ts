module minerva.core.arrange.tapins {
    export var validateFinalRect: IArrangeTapin = function (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree, finalRect: Rect): boolean {
        if (finalRect.width < 0 || finalRect.height < 0
            || !isFinite(finalRect.width) || !isFinite(finalRect.height)
            || isNaN(finalRect.x) || isNaN(finalRect.y)
            || isNaN(finalRect.width) || isNaN(finalRect.height)) {
            minerva.layoutError(tree, this, "Invalid arguments to Arrange.");
            return false;
        }
        return true;
    };
}