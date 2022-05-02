module minerva.core.draft.tapins {
    export var flushPrevious: IDraftTapin = function (data: IDraftPipeData): boolean {
        var updater: Updater;
        while ((updater = data.arrangeList.shift()) != null) {
            Updater.$$propagateUiFlagsUp(updater, UIFlags.ArrangeHint);
        }
        while ((updater = data.sizingList.shift()) != null) {
            Updater.$$propagateUiFlagsUp(updater, UIFlags.SizeHint);
        }
        return true;
    };
}