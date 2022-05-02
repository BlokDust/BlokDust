/// <reference path="../core/Updater" />

module minerva.anon {
    export class AnonymousUpdater extends core.Updater {
        init () {
            this.setMeasurePipe(new measure.AnonymousMeasurePipeDef(this))
                .setArrangePipe(new arrange.AnonymousArrangePipeDef(this));

            super.init();
        }

        measureOverride (availableSize: Size): Size {
            return availableSize;
        }

        arrangeOverride (arrangeSize: Size): Size {
            return arrangeSize;
        }
    }
}