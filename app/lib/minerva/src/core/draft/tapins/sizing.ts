module minerva.core.draft.tapins {
    export var sizing: IDraftTapin = function (data: IDraftPipeData): boolean {
        if (data.flag !== UIFlags.SizeHint)
            return true;

        if (data.sizingList.length <= 0)
            return false;

        var updater: Updater;
        var oldSize = new Size();
        var newSize = new Size();
        while ((updater = data.sizingList.pop()) != null) {
            updater.sizing(oldSize, newSize);
            if (!Size.isEqual(oldSize, new Size)) {
                data.sizingUpdates.push({
                    updater: updater,
                    oldSize: oldSize,
                    newSize: newSize
                });
                oldSize = new Size();
                newSize = new Size();
            }
        }

        return true;
    };
}