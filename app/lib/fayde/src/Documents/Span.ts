/// <reference path="Inline.ts" />

module Fayde.Documents {
    export class Span extends Inline {
        CreateNode (): TextElementNode {
            return new TextElementNode(this, "Inlines");
        }

        static InlinesProperty = DependencyProperty.RegisterImmutable<InlineCollection>("Inlines", () => InlineCollection, Span);
        Inlines: InlineCollection;

        constructor () {
            super();
            var coll = Span.InlinesProperty.Initialize(this);
            coll.AttachTo(this);
            ReactTo(coll, this, (obj?) => this.InlinesChanged(obj.item, obj.add));
        }

        _SerializeText (): string {
            var str = "";
            var enumerator = this.Inlines.getEnumerator();
            while (enumerator.moveNext()) {
                str += (<TextElement>enumerator.current)._SerializeText();
            }
            return str;
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
    Fayde.CoreLibrary.add(Span);
    Markup.Content(Span, Span.InlinesProperty);
}