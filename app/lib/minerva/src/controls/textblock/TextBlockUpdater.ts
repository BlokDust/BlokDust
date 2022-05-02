module minerva.controls.textblock {
    export interface ITextBlockUpdaterAssets extends core.IUpdaterAssets, measure.IInput, arrange.IInput, render.IInput, text.IDocumentContext {
    }

    export class TextBlockUpdater extends core.Updater {
        assets: ITextBlockUpdaterAssets;
        tree: TextBlockUpdaterTree;

        init () {
            this.setTree(new TextBlockUpdaterTree())
                .setMeasurePipe(singleton(measure.TextBlockMeasurePipeDef))
                .setArrangePipe(singleton(arrange.TextBlockArrangePipeDef))
                .setProcessUpPipe(singleton(processup.TextBlockProcessUpPipeDef))
                .setRenderPipe(singleton(render.TextBlockRenderPipeDef))
                .setHitTestPipe(singleton(hittest.TextBlockHitTestPipeDef));

            this.setDocument();

            var assets = this.assets;
            assets.padding = new Thickness();
            assets.selectionStart = 0;
            assets.selectionLength = 0;
            assets.textWrapping = TextWrapping.NoWrap;
            assets.textAlignment = TextAlignment.Left;
            assets.textTrimming = TextTrimming.None;
            assets.lineStackingStrategy = LineStackingStrategy.MaxHeight;
            assets.lineHeight = NaN;

            super.init();
        }

        setDocument (docdef?: text.IDocumentLayoutDef): TextBlockUpdater {
            if (this.tree.doc)
                return this;
            this.tree.doc = text.createDocumentLayout(docdef || new text.DocumentLayoutDef());
            return this;
        }

        invalidateFont (full?: boolean) {
            if (full === true) {
                this.invalidateMeasure();
                this.invalidateArrange();
                this.updateBounds(true);
            }
            this.invalidate();
        }

        invalidateTextMetrics () {
            this.invalidateMeasure();
            this.invalidateArrange();
            this.updateBounds(true);
            this.invalidate();
            var docassets = this.tree.doc.assets;
            docassets.actualWidth = NaN;
            docassets.actualHeight = NaN;
        }
    }
}