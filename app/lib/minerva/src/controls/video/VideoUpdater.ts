module minerva.controls.video {
    export interface IVideoUpdaterAssets extends image.IImageUpdaterAssets {
        source: IVideoSource;
    }

    export class VideoUpdater extends image.ImageUpdater {
        assets: IVideoUpdaterAssets;

        onSurfaceChanged(oldSurface: core.ISurface, newSurface: core.ISurface) {
            if (oldSurface)
                oldSurface.unhookPrerender(this);
            if (newSurface)
                newSurface.hookPrerender(this);
        }

        preRender() {
            var assets = this.assets;
            if (assets.source && assets.source.getIsPlaying())
                this.invalidate();
        }
    }
}