module minerva.controls.usercontrol {
    export interface IUserControlUpdaterAssets extends control.IControlUpdaterAssets, measure.IInput, arrange.IInput {
    }

    export class UserControlUpdater extends controls.control.ControlUpdater {
        assets: IUserControlUpdaterAssets;

        init () {
            this.setMeasurePipe(singleton(measure.UserControlMeasurePipeDef))
                .setArrangePipe(singleton(arrange.UserControlArrangePipeDef))
                .setProcessDownPipe(singleton(processdown.UserControlProcessDownPipeDef));

            var assets = this.assets;
            assets.breakLayoutClip = true;
            assets.padding = new Thickness();
            assets.borderThickness = new Thickness();

            super.init();
        }
    }
}