module minerva.controls.overlay {
    export interface IOverlayUpdaterAssets extends core.IUpdaterAssets {
        isVisible: boolean;
        isOpen: boolean;
    }

    export class OverlayUpdater extends core.Updater {
        assets: IOverlayUpdaterAssets;
        tree: OverlayUpdaterTree;

        init () {
            this.setTree(new OverlayUpdaterTree())
                .setProcessUpPipe(singleton(processup.OverlayProcessUpPipeDef))
                .setHitTestPipe(singleton(hittest.OverlayHitTestPipeDef));

            var assets = this.assets;
            assets.isVisible = false;
            assets.isOpen = false;

            super.init();
        }

        setInitiator (initiator: core.Updater) {
            this.tree.initiatorSurface = initiator.tree.surface;
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
        export function isOpen (updater: OverlayUpdater, oldValue: boolean, newValue: boolean) {
            (newValue === true) ? updater.show() : updater.hide();
        }
    }
}