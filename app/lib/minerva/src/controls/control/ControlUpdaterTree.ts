module minerva.controls.control {
    export class ControlUpdaterTree extends core.UpdaterTree {
        constructor() {
            super();
            this.isContainer = true;
            this.isLayoutContainer = true;
        }
    }
}