/// <reference path="Enums.ts" />
/// <reference path="../Core/FrameworkElement.ts" />

module Fayde.Controls {
    import TextBlockUpdater = minerva.controls.textblock.TextBlockUpdater;
    export class TextBlockNode extends FENode {
        XObject: TextBlock;
        LayoutUpdater: TextBlockUpdater;

        private _IsDocAuto = false;
        private _SettingText = false;
        private _SettingInlines = false;
        private _AutoRun = new Documents.Run();

        constructor (xobj: TextBlock) {
            super(xobj);
        }

        GetInheritedEnumerator (): nullstone.IEnumerator<DONode> {
            var xobj = this.XObject;
            var inlines = xobj.Inlines;
            if (inlines)
                return <nullstone.IEnumerator<DONode>>inlines.GetNodeEnumerator();
        }

        TextChanged (args: IDependencyPropertyChangedEventArgs) {
            if (this._SettingInlines)
                return;

            this._AutoRun.Text = args.NewValue;
            if (!this._IsDocAuto) {
                this._IsDocAuto = true;
                this.LayoutUpdater.tree.clearText();
                this._SettingText = true;
                var inlines = this.XObject.Inlines;
                inlines.Clear();
                inlines.Add(this._AutoRun);
                this.LayoutUpdater.invalidateTextMetrics();
                this._SettingText = false;
            }
        }

        InlinesChanged (inline: Documents.Inline, index: number, isAdd: boolean) {
            var xobj = this.XObject;
            if (isAdd)
                Providers.InheritedStore.PropagateInheritedOnAdd(xobj, inline.XamlNode);

            var updater = this.LayoutUpdater;
            if (isAdd)
                updater.tree.onTextAttached(inline.TextUpdater, index);
            else
                updater.tree.onTextDetached(inline.TextUpdater);

            if (isAdd)
                ReactTo(inline, this, this.InlineChanged);
            else
                UnreactTo(inline, this);

            if (this._SettingText)
                return;

            this._SettingInlines = true;
            var inlines = xobj.Inlines;
            var text = "";
            for (var en = inlines.getEnumerator(); en.moveNext();) {
                text += en.current._SerializeText();
            }
            xobj.SetCurrentValue(TextBlock.TextProperty, text);
            this._SettingInlines = false;

            updater.invalidateTextMetrics();
        }

        InlineChanged(obj?: any) {
            switch (obj.type) {
                case 'font':
                    this.LayoutUpdater.invalidateFont(obj.full);
                    break;
                case 'text':
                    this.LayoutUpdater.invalidateTextMetrics();
                    break;
            }
        }
    }

    export class TextBlock extends FrameworkElement {
        XamlNode: TextBlockNode;

        CreateNode (): TextBlockNode {
            return new TextBlockNode(this);
        }

        CreateLayoutUpdater () {
            return new TextBlockUpdater();
        }

        static PaddingProperty = DependencyProperty.RegisterCore("Padding", () => Thickness, TextBlock);
        static FontFamilyProperty = InheritableOwner.FontFamilyProperty.ExtendTo(TextBlock);
        static FontSizeProperty = InheritableOwner.FontSizeProperty.ExtendTo(TextBlock);
        static FontStretchProperty = InheritableOwner.FontStretchProperty.ExtendTo(TextBlock);
        static FontStyleProperty = InheritableOwner.FontStyleProperty.ExtendTo(TextBlock);
        static FontWeightProperty = InheritableOwner.FontWeightProperty.ExtendTo(TextBlock);
        static ForegroundProperty = InheritableOwner.ForegroundProperty.ExtendTo(TextBlock);
        static TextDecorationsProperty = InheritableOwner.TextDecorationsProperty.ExtendTo(TextBlock);
        static TextProperty = DependencyProperty.Register("Text", () => String, TextBlock, "", (d, args) => (<TextBlock>d).XamlNode.TextChanged(args));
        static InlinesProperty = DependencyProperty.RegisterImmutable<Documents.InlineCollection>("Inlines", () => Documents.InlineCollection, TextBlock);
        static LineStackingStrategyProperty = DependencyProperty.RegisterCore("LineStackingStrategy", () => new Enum(LineStackingStrategy), TextBlock, LineStackingStrategy.MaxHeight);
        static LineHeightProperty = DependencyProperty.RegisterCore("LineHeight", () => Number, TextBlock, NaN);
        static TextAlignmentProperty = DependencyProperty.RegisterCore("TextAlignment", () => new Enum(TextAlignment), TextBlock, TextAlignment.Left);
        static TextTrimmingProperty = DependencyProperty.RegisterCore("TextTrimming", () => new Enum(TextTrimming), TextBlock, TextTrimming.None);
        static TextWrappingProperty = DependencyProperty.RegisterCore("TextWrapping", () => new Enum(TextWrapping), TextBlock, TextWrapping.NoWrap);
        Padding: Thickness;
        Foreground: Media.Brush;
        FontFamily: string;
        FontStretch: string;
        FontStyle: string;
        FontWeight: FontWeight;
        FontSize: number;
        TextDecorations: TextDecorations;
        Text: string;
        Inlines: Documents.InlineCollection;
        LineStackingStrategy: LineStackingStrategy;
        LineHeight: number;
        TextAlignment: TextAlignment;
        TextTrimming: TextTrimming;
        TextWrapping: TextWrapping;

        constructor () {
            super();

            var inlines = TextBlock.InlinesProperty.Initialize(this);
            inlines.AttachTo(this);
            ReactTo(inlines, this, (change?) => this.XamlNode.InlinesChanged(change.item, change.index, change.add));

            UIReaction<Media.Brush>(TextBlock.ForegroundProperty, (upd, ov, nv) => upd.invalidate(), true, true, this);
            UIReaction<Thickness>(TextBlock.PaddingProperty, (upd: TextBlockUpdater, ov, nv) => upd.invalidateTextMetrics(), false, true, this);
            UIReaction<minerva.LineStackingStrategy>(TextBlock.LineStackingStrategyProperty, (upd: TextBlockUpdater, ov, nv) => upd.invalidateTextMetrics(), false, true, this);
            UIReaction<number>(TextBlock.LineHeightProperty, (upd: TextBlockUpdater, ov, nv) => upd.invalidateTextMetrics(), false, true, this);
            UIReaction<minerva.TextAlignment>(TextBlock.TextAlignmentProperty, (upd: TextBlockUpdater, ov, nv) => upd.invalidateTextMetrics(), false, true, this);
            UIReaction<minerva.TextTrimming>(TextBlock.TextTrimmingProperty, (upd: TextBlockUpdater, ov, nv) => upd.invalidateTextMetrics(), false, true, this);
            UIReaction<minerva.TextWrapping>(TextBlock.TextWrappingProperty, (upd: TextBlockUpdater, ov, nv) => upd.invalidateTextMetrics(), false, true, this);
        }

        IsInheritable (propd: DependencyProperty): boolean {
            if (TextBlockInheritedProps.indexOf(propd) > -1)
                return true;
            return super.IsInheritable(propd);
        }
    }
    Fayde.CoreLibrary.add(TextBlock);
    Markup.Content(TextBlock, TextBlock.InlinesProperty);
    Markup.TextContent(TextBlock, TextBlock.TextProperty);

    var TextBlockInheritedProps = [
        TextBlock.FontFamilyProperty,
        TextBlock.FontSizeProperty,
        TextBlock.FontStretchProperty,
        TextBlock.FontStyleProperty,
        TextBlock.FontWeightProperty,
        TextBlock.ForegroundProperty
    ];
}