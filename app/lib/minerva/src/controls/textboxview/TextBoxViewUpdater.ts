module minerva.controls.textboxview {
    export interface ITextBoxViewUpdaterAssets extends core.IUpdaterAssets, measure.IInput, arrange.IInput, render.IInput, text.IDocumentContext {
        isReadOnly: boolean;
        isFocused: boolean;
    }

    export class TextBoxViewUpdater extends core.Updater {
        assets: ITextBoxViewUpdaterAssets;
        tree: TextBoxViewUpdaterTree;
        blinker: Blinker;

        init () {
            this.setTree(new TextBoxViewUpdaterTree())
                .setMeasurePipe(singleton(measure.TextBoxViewMeasurePipeDef))
                .setArrangePipe(singleton(arrange.TextBoxViewArrangePipeDef))
                .setProcessUpPipe(singleton(processup.TextBoxViewProcessUpPipeDef))
                .setRenderPipe(singleton(render.TextBoxViewRenderPipeDef))
                .setHitTestPipe(singleton(hittest.TextBoxViewHitTestPipeDef));

            this.setDocument();

            var assets = this.assets;
            assets.selectionStart = 0;
            assets.selectionLength = 0;
            assets.textWrapping = TextWrapping.NoWrap;
            assets.textAlignment = TextAlignment.Left;
            assets.lineStackingStrategy = LineStackingStrategy.MaxHeight;
            assets.lineHeight = NaN;

            assets.isCaretVisible = false;
            assets.caretBrush = null;
            assets.caretRegion = new Rect();
            assets.isReadOnly = false;

            this.blinker = new Blinker((isVisible) => {
                this.assets.isCaretVisible = isVisible;
                this.invalidateCaret();
            });

            super.init();
        }

        setDocument (docdef?: text.IDocumentLayoutDef): TextBoxViewUpdater {
            if (this.tree.doc)
                return this;
            this.tree.doc = text.createDocumentLayout(docdef || new text.DocumentLayoutDef());
            return this;
        }

        getCursorFromPoint (point: IPoint): number {
            var doc = this.tree.doc;
            return doc.def.getCursorFromPoint(point, this.assets, doc.assets);
        }

        invalidateFont (full?: boolean) {
            if (full === true) {
                this.invalidateMeasure();
                this.invalidateArrange();
                this.updateBounds(true);
            }
            this.invalidate();
        }

        invalidateTextMetrics (): TextBoxViewUpdater {
            this.invalidateMeasure()
                .invalidateArrange()
                .updateBounds(true)
                .invalidate();
            return this;
        }

        invalidateMeasure (): TextBoxViewUpdater {
            super.invalidateMeasure();
            var docassets = this.tree.doc.assets;
            docassets.actualWidth = NaN;
            docassets.actualHeight = NaN;
            return this;
        }

        invalidateCaret () {
            var assets = this.assets;
            var region = new Rect();
            Rect.copyTo(assets.caretRegion, region);
            Rect.transform(region, assets.absoluteXform);
            this.invalidate(region)
        }

        invalidateSelectionStart () {
            this.tree.doc.assets.selCached = false;
            this.invalidateCaretRegion();
            this.resetCaretBlinker(true);
        }

        invalidateSelectionLength (switching: boolean) {
            this.tree.doc.assets.selCached = false;
            this.invalidate();
            this.resetCaretBlinker(switching);
            if (switching)
                this.invalidateCaretRegion();
        }

        invalidateCaretRegion () {
            this.invalidateCaret();
            var cr = this.assets.caretRegion;
            cr.x = cr.y = cr.width = cr.height = 0;
        }

        resetCaretBlinker (shouldDelay: boolean) {
            var assets = this.assets;
            var blinker = this.blinker;

            if (assets.selectionLength > 0 || assets.isReadOnly || !assets.isFocused)
                return blinker.end();
            if (shouldDelay)
                return blinker.delay();
            return blinker.begin();
        }
    }
}