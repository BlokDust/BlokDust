module minerva.text.run {
    export class RunLayoutDef implements ITextLayoutDef {
        layout (docctx: IDocumentContext, docassets: IDocumentAssets, assets: ITextAssets): boolean {
            //TODO: Implement lineStackingStrategy, lineHeight
            var text = assets.text;
            if (!text) {
                var line = new layout.Line();
                line.height = assets.font.getHeight();
                docassets.lines.push(line);
                var run1 = new layout.Run();
                run1.attrs = assets;
                line.runs.push(run1);
                docassets.actualHeight = line.height;
                return false;
            }

            /*
             The TextTrimming property has no effect unless the TextWrapping property is set to NoWrap.
             Source: https://msdn.microsoft.com/en-us/library/system.windows.controls.textblock.texttrimming(v=vs.95).aspx
             */
            if (docctx.textWrapping === TextWrapping.NoWrap)
                run.doLayoutNoWrap(docctx, docassets, assets);
            else
                run.doLayoutWrap(docctx, docassets, assets);

            docassets.selCached = false;
            return true;
        }
    }
}