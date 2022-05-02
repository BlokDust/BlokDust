module minerva.text {
    export interface ITextUpdaterAssets extends ITextAssets {
        fontFamily: string;
        fontSize: number;
        fontStretch: string;
        fontStyle: string;
        fontWeight: FontWeight;
        textDecorations: TextDecorations;
        language: string;
    }

    export class TextUpdater {
        assets: ITextUpdaterAssets = {
            fontFamily: Font.DEFAULT_FAMILY,
            fontSize: Font.DEFAULT_SIZE,
            fontStretch: Font.DEFAULT_STRETCH,
            fontStyle: Font.DEFAULT_STYLE,
            fontWeight: Font.DEFAULT_WEIGHT,
            textDecorations: TextDecorations.None,
            language: "",
            background: null,
            selectionBackground: null,
            foreground: null,
            selectionForeground: null,
            isUnderlined: false,
            font: new Font(),
            text: ""
        };

        private $$textlayout: ITextLayoutDef;

        constructor () {
            this.init();
        }

        init () {
            this.setTextLayout();
        }

        /////// PREPARE TEXT LAYOUT

        setTextLayout (tldef?: ITextLayoutDef): TextUpdater {
            if (this.$$textlayout)
                return this;
            this.$$textlayout = tldef || new run.RunLayoutDef();
            return this;
        }

        /////// TEXT LAYOUT

        layout (docctx: IDocumentContext, docassets: IDocumentAssets): number {
            this.$$textlayout.layout(docctx, docassets, this.assets);
            return this.assets.text.length;
        }

        invalidateFont (): boolean {
            var assets = this.assets;
            return Font.mergeInto(assets.font, assets.fontFamily, assets.fontSize, assets.fontStretch, assets.fontStyle, assets.fontWeight);
        }
    }
}