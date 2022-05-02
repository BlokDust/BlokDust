module minerva.core.arrange.tapins {
    export var prepareOverride: IArrangeTapin = function (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree, finalRect: Rect): boolean {
        var framework = state.framework;
        framework.width = 0;
        framework.height = 0;
        helpers.coerceSize(framework, input);

        if (input.horizontalAlignment === HorizontalAlignment.Stretch)
            framework.width = Math.max(framework.width, state.stretched.width);

        if (input.verticalAlignment === VerticalAlignment.Stretch)
            framework.height = Math.max(framework.height, state.stretched.height);

        var fs = state.finalSize;
        var hd = input.hiddenDesire;
        fs.width = Math.max(hd.width, framework.width);
        fs.height = Math.max(hd.height, framework.height);

        return true;
    };
}