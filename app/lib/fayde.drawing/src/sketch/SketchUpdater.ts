module Fayde.Drawing.sketch {
    export interface ISketchUpdaterAssets extends minerva.core.IUpdaterAssets, render.IInput {
    }

    export class SketchUpdater extends minerva.core.Updater {
        assets: ISketchUpdaterAssets;

        init () {
            this.setHitTestPipe(minerva.singleton(hittest.SketchHitTestPipeDef))
                .setRenderPipe(minerva.singleton(render.SketchRenderPipeDef));

            var assets = this.assets;
            assets.canvas = document.createElement('canvas');

            super.init();
        }

        // on size changed, set canvas dimensions to fit.
        onSizeChanged (oldSize: minerva.Size, newSize: minerva.Size) {
            super.onSizeChanged(oldSize, newSize);
            var assets = this.assets;
            assets.canvas.width = newSize.width;
            assets.canvas.height = newSize.height;
        }
    }
}