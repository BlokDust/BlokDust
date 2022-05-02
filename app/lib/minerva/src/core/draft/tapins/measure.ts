module minerva.core.draft.tapins {
    export var measure: IDraftTapin = function (data: IDraftPipeData): boolean {
        if (data.flag !== UIFlags.MeasureHint)
            return true;

        if (data.measureList.length <= 0)
            return false;

        var updater: Updater;
        while ((updater = data.measureList.shift()) != null) {
            updater.doMeasure();
        }

        return true;
    };
}