module minerva.core.draft {
    export interface IDraftTapin extends pipe.ITapin {
        (data: IDraftPipeData): boolean;
    }
    export interface IDraftPipeData extends pipe.IPipeData {
        updater: Updater;
        tree: IUpdaterTree;
        assets: IUpdaterAssets;
        flag: UIFlags;
        measureList: Updater[];
        arrangeList: Updater[];
        sizingList: Updater[];
        surfaceSize: Size;
        sizingUpdates: ISizingUpdate[];
    }
    export interface ISizingUpdate {
        updater: Updater;
        oldSize: Size;
        newSize: Size;
    }
    export class DraftPipeDef extends pipe.PipeDef<IDraftTapin, IDraftPipeData> {
        constructor () {
            super();
            this.addTapin('flushPrevious', tapins.flushPrevious)
                .addTapin('determinePhase', tapins.determinePhase)
                .addTapin('prepareMeasure', tapins.prepareMeasure)
                .addTapin('measure', tapins.measure)
                .addTapin('prepareArrange', tapins.prepareArrange)
                .addTapin('arrange', tapins.arrange)
                .addTapin('prepareSizing', tapins.prepareSizing)
                .addTapin('sizing', tapins.sizing)
                .addTapin('notifyResize', tapins.notifyResize);
        }

        prepare (data: IDraftPipeData) {
        }

        flush (data: IDraftPipeData) {
        }
    }
}