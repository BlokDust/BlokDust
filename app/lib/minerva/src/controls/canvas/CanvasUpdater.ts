/// <reference path="../panel/PanelUpdater" />

module minerva.controls.canvas {
    export interface ICanvasUpdaterAssets extends panel.IPanelUpdaterAssets, measure.IInput {
    }

    export class CanvasUpdater extends panel.PanelUpdater {
        assets: ICanvasUpdaterAssets;

        init() {
            this.setMeasurePipe(singleton(measure.CanvasMeasurePipeDef))
                .setArrangePipe(singleton(arrange.CanvasArrangePipeDef))
                .setProcessDownPipe(singleton(processdown.CanvasProcessDownPipeDef))
                .setProcessUpPipe(singleton(processup.CanvasProcessUpPipeDef));

            var assets = this.assets;
            assets.breakLayoutClip = true;

            super.init();
        }
    }
    export module reactTo {
        export function left(updater: core.Updater, oldValue: number, newValue: number) {
            invalidateTopLeft(updater);
        }

        export function top(updater: core.Updater, oldValue: number, newValue: number) {
            invalidateTopLeft(updater);
        }

        function invalidateTopLeft(updater: core.Updater) {
            var vp = updater.tree.visualParent;
            if (updater instanceof CanvasUpdater && !vp) {
                updater.assets.dirtyFlags |= DirtyFlags.LocalTransform;
                minerva.core.Updater.$$addDownDirty(updater);
                updater.invalidateArrange();
            }

            if (!(vp instanceof CanvasUpdater))
                return;

            var ls = updater.assets.layoutSlot;
            minerva.Size.copyTo(updater.assets.desiredSize, ls);
            //Coerce NaN, null, undefined to 0
            ls.x = updater.getAttachedValue("Canvas.Left") || 0;
            ls.y = updater.getAttachedValue("Canvas.Top") || 0;
            if (updater.assets.useLayoutRounding) {
                ls.x = Math.round(ls.x);
                ls.y = Math.round(ls.y);
                ls.width = Math.round(ls.width);
                ls.height = Math.round(ls.height);
            }
            updater.invalidateArrange();
        }
    }
}