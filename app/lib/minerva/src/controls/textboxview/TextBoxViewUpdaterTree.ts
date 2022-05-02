module minerva.controls.textboxview {
    export interface ITextBoxViewUpdaterTree {
        doc: text.IDocumentLayout<text.IDocumentLayoutDef, text.IDocumentAssets>;
        layout(constraint: Size, docctx: text.IDocumentContext): Size;
        render(ctx: core.render.RenderContext, docctx: text.IDocumentContext);
        getCaretRegion (docctx: text.IDocumentContext): Rect;
        setAvailableWidth(width: number);
        getHorizontalOffset(docctx: text.IDocumentContext): number;
        walkText(): IWalker<text.TextUpdater>;
        onTextAttached(child: text.TextUpdater);
        onTextDetached(child: text.TextUpdater);
    }
    export class TextBoxViewUpdaterTree extends core.UpdaterTree implements ITextBoxViewUpdaterTree {
        doc: text.IDocumentLayout<text.IDocumentLayoutDef, text.IDocumentAssets>;
        children: text.TextUpdater[] = [];

        setMaxWidth (width: number, docctx: text.IDocumentContext) {
            return this.doc.def.setMaxWidth(docctx, this.doc.assets, width);
        }

        layout (constraint: Size, docctx: text.IDocumentContext): Size {
            var doc = this.doc;
            doc.def.layout(docctx, doc.assets, constraint, this.walkText());
            return new Size(doc.assets.actualWidth, doc.assets.actualHeight);
        }

        render (ctx: core.render.RenderContext, docctx: text.IDocumentContext) {
            var doc = this.doc;
            doc.def.render(ctx, docctx, doc.assets);
        }

        setAvailableWidth (width: number) {
            this.doc.assets.availableWidth = width;
        }

        getHorizontalOffset (docctx: text.IDocumentContext): number {
            var doc = this.doc;
            return doc.def.getHorizontalAlignmentX(docctx, doc.assets, doc.assets.actualWidth);
        }

        getCaretRegion (docctx: text.IDocumentContext): Rect {
            var doc = this.doc;
            return doc.def.getCaretFromCursor(docctx, doc.assets);
        }

        clearText () {
            this.children.length = 0;
        }

        walkText (): IWalker<text.TextUpdater> {
            var i = -1;
            var children = this.children;
            return {
                current: undefined,
                step: function (): boolean {
                    i++;
                    this.current = children[i];
                    return this.current !== undefined;
                }
            };
        }

        onTextAttached (child: text.TextUpdater, index?: number) {
            if (index == null || index < 0 || index >= this.children.length)
                this.children.push(child);
            else
                this.children.splice(index, 0, child);
        }

        onTextDetached (child: text.TextUpdater) {
            var index = this.children.indexOf(child);
            if (index > -1)
                this.children.splice(index, 1);
        }
    }
}