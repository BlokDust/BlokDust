/// <reference path="../../core/UpdaterTree" />

module minerva.controls.overlay {
    export class OverlayUpdaterTree extends core.UpdaterTree {
        layer: core.Updater = undefined; //Root layer that will be attached to the surface
        initiatorSurface: core.ISurface = undefined;
    }
}