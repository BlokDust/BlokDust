/// <reference path="../../core/UpdaterTree" />

module minerva.controls.popup {
    export class PopupUpdaterTree extends core.UpdaterTree {
        popupChild: core.Updater = undefined; //`Popup`.`Child` that will be a child of `layer`
        layer: core.Updater = undefined; //Root layer that will be attached to the surface
        initiatorSurface: core.ISurface = undefined;
    }
}