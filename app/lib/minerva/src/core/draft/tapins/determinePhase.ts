module minerva.core.draft.tapins {
    export var determinePhase: IDraftTapin = function (data: IDraftPipeData): boolean {
        data.flag = UIFlags.None;
        var assets = data.assets;
        if (assets.visibility !== Visibility.Visible)
            return true;

        if ((assets.uiFlags & UIFlags.MeasureHint) > 0) {
            data.flag = UIFlags.MeasureHint;
        } else if ((assets.uiFlags & UIFlags.ArrangeHint) > 0) {
            data.flag = UIFlags.ArrangeHint;
        } else if ((assets.uiFlags & UIFlags.SizeHint) > 0) {
            data.flag = UIFlags.SizeHint;
        } else {
            return false;
        }

        return true;
    };
}