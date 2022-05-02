module minerva.controls.popup {
    export interface IPopupUpdaterAssets extends core.IUpdaterAssets, processdown.IInput {
        isVisible: boolean;
        isOpen: boolean;
    }

    export class PopupUpdater extends core.Updater {
        assets: IPopupUpdaterAssets;
        tree: PopupUpdaterTree;

        init () {
            this.setTree(new PopupUpdaterTree())
                .setProcessDownPipe(singleton(processdown.PopupProcessDownPipeDef))
                .setProcessUpPipe(singleton(processup.PopupProcessUpPipeDef))
                .setHitTestPipe(singleton(hittest.PopupHitTestPipeDef));

            var assets = this.assets;
            assets.horizontalOffset = 0;
            assets.verticalOffset = 0;
            assets.isVisible = false;
            assets.isOpen = false;

            super.init();
        }

        setInitiator (initiator: core.Updater) {
            this.tree.initiatorSurface = initiator.tree.surface;
        }

        setChild (child: core.Updater) {
            var old = this.tree.popupChild;
            if (old) {
                old.assets.carrierXform = null;
            }
            this.tree.popupChild = child;
            if (child) {
                child.assets.carrierXform = mat3.identity();
            }
        }

        setLayer (layer: core.Updater) {
            this.hide();
            this.tree.layer = layer;
            if (this.assets.isOpen)
                this.show();
        }

        hide (): boolean {
            var layer = this.tree.layer;
            if (!this.assets.isVisible || !layer)
                return false;
            this.assets.isVisible = false;
            var surface = this.tree.initiatorSurface;
            if (!surface)
                return false;
            surface.detachLayer(layer);
            return true;
        }

        show (): boolean {
            var layer = this.tree.layer;
            if (this.assets.isVisible || !layer)
                return false;
            this.assets.isVisible = true;
            var surface = this.tree.initiatorSurface;
            if (!surface)
                return false;
            surface.attachLayer(layer);
            return true;
        }
    }

    export module reactTo {
        export function isOpen (updater: PopupUpdater, oldValue: boolean, newValue: boolean) {
            (newValue === true) ? updater.show() : updater.hide();
        }

        export function horizontalOffset (updater: PopupUpdater, oldValue: number, newValue: number) {
            var tree = updater.tree;
            var child = tree.popupChild;
            if (!child)
                return;
            var tweenX = newValue - oldValue;
            if (tweenX === 0)
                return;
            tweenOffset(child, tweenX, 0);
            if (tree.layer)
                tree.layer.invalidateMeasure();
        }

        export function verticalOffset (updater: PopupUpdater, oldValue: number, newValue: number) {
            var tree = updater.tree;
            var child = tree.popupChild;
            if (!child)
                return;
            var tweenY = newValue - oldValue;
            if (tweenY === 0)
                return;
            tweenOffset(child, 0, tweenY);
            if (tree.layer)
                tree.layer.invalidateMeasure();
        }

        function tweenOffset (child: core.Updater, tweenX: number, tweenY: number) {
            if (child.assets.carrierXform) {
                mat3.translate(child.assets.carrierXform, tweenX, tweenY);
            }
        }
    }
}