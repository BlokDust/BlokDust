module minerva.text {
    export interface IDocumentContext {
        selectionStart: number;
        selectionLength: number;
        textWrapping: TextWrapping;
        textAlignment: TextAlignment;
        textTrimming: TextTrimming;
        lineStackingStrategy: LineStackingStrategy;
        lineHeight: number;
    }
    export interface IDocumentAssets {
        availableWidth: number;
        actualWidth: number;
        actualHeight: number;
        maxWidth: number;
        maxHeight: number;
        lines: layout.Line[];
        selCached: boolean;
    }

    export interface IDocumentLayoutDef {
        createAssets (): IDocumentAssets;
        setMaxWidth (docctx: IDocumentContext, docassets: IDocumentAssets, width: number): boolean;
        layout (docctx: IDocumentContext, docassets: IDocumentAssets, constraint: Size, walker: IWalker<text.TextUpdater>): boolean;
        render (ctx: core.render.RenderContext, docctx: IDocumentContext, docassets: IDocumentAssets);
        getCursorFromPoint (point: IPoint, docctx: IDocumentContext, docassets: IDocumentAssets): number;
        getCaretFromCursor(docctx: IDocumentContext, docassets: IDocumentAssets): Rect;
        getHorizontalAlignmentX (docctx: IDocumentContext, assets: IDocumentAssets, lineWidth: number): number;
    }

    export class DocumentLayoutDef implements IDocumentLayoutDef {
        createAssets (): IDocumentAssets {
            return {
                availableWidth: Number.POSITIVE_INFINITY,
                actualWidth: NaN,
                actualHeight: NaN,
                maxWidth: Number.POSITIVE_INFINITY,
                maxHeight: Number.POSITIVE_INFINITY,
                lines: [],
                selCached: false
            };
        }

        setMaxWidth (docctx: IDocumentContext, docassets: IDocumentAssets, width: number): boolean {
            if (docassets.maxWidth === width)
                return false;
            docassets.maxWidth = width;
            docassets.actualWidth = NaN;
            docassets.actualHeight = NaN;
            return true;
        }

        layout (docctx: IDocumentContext, docassets: IDocumentAssets, constraint: Size, walker: IWalker<text.TextUpdater>): boolean {
            if (!isNaN(docassets.actualWidth))
                return false;
            docassets.maxWidth = constraint.width;

            docassets.actualWidth = 0.0;
            docassets.actualHeight = 0.0;
            docassets.lines = [];
            for (var offset = 0; walker.step();) {
                offset += walker.current.layout(docctx, docassets);
            }
            return true;
        }

        render (ctx: core.render.RenderContext, docctx: IDocumentContext, docassets: IDocumentAssets) {
            this.splitSelection(docctx, docassets);

            ctx.save();
            docassets.lines.forEach(line => {
                var halign = this.getHorizontalAlignmentX(docctx, docassets, line.width);
                ctx.translate(halign, 0);
                line.runs.forEach(run => {
                    if (run.pre) {
                        layout.Cluster.render(run.pre, run.attrs, ctx);
                        ctx.translate(run.pre.width, 0);
                    }
                    if (run.sel) {
                        layout.Cluster.render(run.sel, run.attrs, ctx);
                        ctx.translate(run.sel.width, 0);
                    }
                    if (run.post) {
                        layout.Cluster.render(run.post, run.attrs, ctx);
                        ctx.translate(run.post.width, 0);
                    }
                });
                ctx.translate(-line.width - halign, line.height);
            });
            ctx.restore();
        }

        getCursorFromPoint (point: IPoint, docctx: IDocumentContext, docassets: IDocumentAssets): number {
            var line = docassets.lines[0];
            if (!line)
                return 0;

            //NOTE: Find line that contains point
            var advance = 0;
            if (point.y > 0) {
                for (var cury = 0, lines = docassets.lines, i = 0, len = lines.length; i < len; i++) {
                    line = lines[i];
                    if (point.y <= (cury + line.height))
                        break;
                    advance += line.runs.reduce<number>((agg, r) => agg + r.length, 0);
                    cury += line.height;
                }
            }

            var px = point.x - this.getHorizontalAlignmentX(docctx, docassets, line.width);
            if (px < 0)
                return advance;

            //NOTE: Find run that contains point
            var curx = 0;
            var i = 0;
            for (var runs = line.runs, len = runs.length; i < len; i++) {
                var run = runs[i];
                if (px <= (curx + run.width))
                    break;
                advance += run.length;
                curx += run.width;
            }
            var run = runs[i];
            if (!run)
                return advance;

            //NOTE: Guess at cursor
            var end = Math.max(0, Math.min(run.text.length, Math.ceil((px - curx) / run.width * run.text.length)));
            var usedText = run.text.substr(0, end);
            //NOTE: Move backward if width is right of point
            var width: number;
            while (end > 0 && (width = this.measureTextWidth(usedText, run.attrs.font)) > px) {
                end--;
                usedText = run.text.substr(0, end);
            }
            //NOTE: Move forward if width is left of point
            var lastEnd = end;
            while (end < run.text.length && (width = this.measureTextWidth(usedText, run.attrs.font)) < px) {
                lastEnd = end;
                end++;
                usedText = run.text.substr(0, end);
            }

            return advance + lastEnd;
        }

        getCaretFromCursor (docctx: IDocumentContext, docassets: IDocumentAssets): Rect {
            var cursor = docctx.selectionStart;
            var advance = 0;
            var cr = new Rect(0, 0, 1, 0);
            var lastLineHeight = 0;
            for (var lines = docassets.lines, i = 0, len = lines.length; i < len; i++) {
                var line = lines[i];
                cr.x = this.getHorizontalAlignmentX(docctx, docassets, line.width);
                cr.height = line.height;
                for (var runs = line.runs, j = 0, len2 = runs.length; j < len2; j++) {
                    var run = runs[j];
                    if ((advance + run.length) > cursor) {
                        cr.x += this.measureTextWidth(run.text.substr(0, cursor - advance), run.attrs.font);
                        return cr;
                    }
                    advance += run.length;
                    cr.x += line.width;
                }
                cr.y += line.height;
                lastLineHeight = line.height;
            }
            cr.y -= lastLineHeight;
            return cr;
        }

        splitSelection (docctx: IDocumentContext, assets: IDocumentAssets) {
            if (assets.selCached)
                return;
            var start = docctx.selectionStart;
            assets.lines.forEach(line =>
                line.runs.forEach(run => {
                    layout.Run.splitSelection(run, start, start + docctx.selectionLength, (text, attrs) => this.measureTextWidth(text, attrs.font));
                    start -= run.length;
                }));
            assets.selCached = true;
        }

        getHorizontalAlignmentX (docctx: IDocumentContext, assets: IDocumentAssets, lineWidth: number): number {
            if (docctx.textAlignment === TextAlignment.Left || docctx.textAlignment === TextAlignment.Justify
                || (docctx.textWrapping === TextWrapping.NoWrap && docctx.textTrimming !== TextTrimming.None))
                return 0;
            var width = getWidthConstraint(assets);
            if (lineWidth >= width)
                return 0;
            if (docctx.textAlignment === TextAlignment.Center)
                return (width - lineWidth) / 2.0;
            return width - lineWidth;
        }

        measureTextWidth (text: string, font: Font): number {
            return engine.Surface.measureWidth(text, font);
        }
    }

    function getWidthConstraint (assets: IDocumentAssets): number {
        if (isFinite(assets.availableWidth))
            return assets.availableWidth;
        if (!isFinite(assets.maxWidth))
            return assets.actualWidth;
        return Math.min(assets.actualWidth, assets.maxWidth);
    }
}