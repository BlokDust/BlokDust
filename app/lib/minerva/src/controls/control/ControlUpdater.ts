module minerva.controls.control {
    export interface IControlUpdaterAssets extends core.IUpdaterAssets {
        isEnabled: boolean;
    }

    export class ControlUpdater extends core.Updater {
        assets: IControlUpdaterAssets;

        init () {
            this.setTree(new ControlUpdaterTree())
                .setHitTestPipe(singleton(hittest.ControlHitTestPipeDef));

            this.assets.isEnabled = true;

            super.init();
        }
    }
}