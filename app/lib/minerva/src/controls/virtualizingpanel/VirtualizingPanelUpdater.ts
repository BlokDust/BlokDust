module minerva.controls.virtualizingpanel {
    export class VirtualizingPanelUpdater extends panel.PanelUpdater {
        tree: VirtualizingPanelUpdaterTree;

        init() {
            this.setTree(new VirtualizingPanelUpdaterTree());

            super.init();
        }
    }
}