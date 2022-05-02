module minerva.core.draft.tapins {
    export var prepareArrange: IDraftTapin = function (data: IDraftPipeData): boolean {
        if (data.flag !== UIFlags.ArrangeHint)
            return true;

        for (var walker = data.updater.walkDeep(); walker.step();) {
            var assets = walker.current.assets;
            if (assets.visibility !== Visibility.Visible) {
                walker.skipBranch();
                continue;
            }
            if ((assets.uiFlags & UIFlags.ArrangeHint) === 0) {
                walker.skipBranch();
                continue;
            }

            assets.uiFlags &= ~UIFlags.ArrangeHint;
            if ((assets.dirtyFlags & DirtyFlags.Arrange) > 0)
                data.arrangeList.push(walker.current);
        }

        return true;
    };
}