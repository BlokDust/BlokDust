module minerva.controls.grid {
    export interface IGridUpdaterAssets extends panel.IPanelUpdaterAssets, measure.IInput, arrange.IInput, render.IInput {
        gridState: IGridState;
    }

    export class GridUpdater extends panel.PanelUpdater {
        assets: IGridUpdaterAssets;

        init () {
            this.setMeasurePipe(singleton(measure.GridMeasurePipeDef))
                .setArrangePipe(singleton(arrange.GridArrangePipeDef))
                .setProcessUpPipe(singleton(processup.GridProcessUpPipeDef))
                .setRenderPipe(singleton(render.GridRenderPipeDef));

            var assets = this.assets;
            assets.showGridLines = false;
            assets.columnDefinitions = [];
            assets.rowDefinitions = [];
            assets.gridState = createGridState();

            super.init();
        }
    }

    export module reactTo {
        function invalidateCell (updater: core.Updater) {
            var vp = updater.tree.visualParent;
            if (vp instanceof GridUpdater)
                vp.invalidateMeasure();
            updater.invalidateMeasure();
        }

        export function showGridLines (updater: GridUpdater, ov: boolean, nv: boolean) {
            updater.invalidateMeasure();
            updater.invalidate();
        }

        export function column (updater: core.Updater, ov: number, nv: number) {
            invalidateCell(updater);
        }

        export function columnSpan (updater: core.Updater, ov: number, nv: number) {
            invalidateCell(updater);
        }

        export function row (updater: core.Updater, ov: number, nv: number) {
            invalidateCell(updater);
        }

        export function rowSpan (updater: core.Updater, ov: number, nv: number) {
            invalidateCell(updater);
        }
    }
}