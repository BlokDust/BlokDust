/// <reference path="Block.ts" />

module Fayde.Documents {
    export class Paragraph extends Block {
        CreateNode(): TextElementNode {
            return new TextElementNode(this, "Inlines");
        }

        static InlinesProperty = DependencyProperty.RegisterImmutable<InlineCollection>("Inlines", () => InlineCollection, Paragraph);
        Inlines: InlineCollection;

        constructor() {
            super();
            var coll = Paragraph.InlinesProperty.Initialize(this);
            coll.AttachTo(this);
            ReactTo(coll, this, (obj?) => this.InlinesChanged(obj.item, obj.add));
        }

        InlinesChanged (inline: Inline, isAdd: boolean) {
            if (isAdd)
                Providers.InheritedStore.PropagateInheritedOnAdd(this, inline.XamlNode);

            if (isAdd)
                ReactTo(inline, this, (obj?) => Incite(this, obj));
            else
                UnreactTo(inline, this);

            Incite(this, {
                type: 'text',
                full: true
            });
        }
    }
    Fayde.CoreLibrary.add(Paragraph);
    Markup.Content(Paragraph, Paragraph.InlinesProperty);
}