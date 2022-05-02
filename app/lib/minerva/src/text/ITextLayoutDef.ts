module minerva.text {
    export interface ITextAssets {
        text: string;
        background: IBrush;
        selectionBackground: IBrush;
        foreground: IBrush;
        selectionForeground: IBrush;
        isUnderlined: boolean;
        font: Font;
    }

    export interface ITextLayoutDef {
        layout(docctx: IDocumentContext, docassets: IDocumentAssets, assets: ITextAssets);
    }
}