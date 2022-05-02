module minerva.controls.panel {
    export interface IPanelUpdaterAssets extends core.IUpdaterAssets, measure.IInput, arrange.IInput, processup.IInput, render.IInput {
    }

    export class PanelUpdater extends core.Updater {
        assets: IPanelUpdaterAssets;
        tree: PanelUpdaterTree;

        init () {
            var assets = this.assets;
            assets.background = null;

            this.setTree(new PanelUpdaterTree())
                .setMeasurePipe(singleton(measure.PanelMeasurePipeDef))
                .setArrangePipe(singleton(arrange.PanelArrangePipeDef))
                .setProcessUpPipe(singleton(processup.PanelProcessUpPipeDef))
                .setRenderPipe(singleton(render.PanelRenderPipeDef))
                .setHitTestPipe(singleton(hittest.PanelHitTestPipeDef));
            super.init();
        }

        setChildren (children: core.Updater[]): PanelUpdater {
            this.tree.children = children;
            return this;
        }
    }

    export module reactTo {
        export function zIndex (updater: core.Updater, oldValue: number, newValue: number) {
            var vp = <PanelUpdater>updater.tree.visualParent;
            if (vp)
                vp.tree.zSorted = null;
        }
    }
}