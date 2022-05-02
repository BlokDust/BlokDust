module minerva.core.draft.tapins {
    export var notifyResize: IDraftTapin = function (data: IDraftPipeData): boolean {
        if (data.flag !== UIFlags.SizeHint)
            return true;
        if (data.sizingUpdates.length <= 0)
            return true;

        var update: ISizingUpdate;
        while ((update = data.sizingUpdates.pop()) != null) {
            update.updater.onSizeChanged(update.oldSize, update.newSize);
        }

        return true;
    };
}