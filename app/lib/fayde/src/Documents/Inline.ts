/// <reference path="TextElement.ts" />

module Fayde.Documents {
    export class Inline extends TextElement {
        static TextDecorationsProperty = InheritableOwner.TextDecorationsProperty.ExtendTo(Inline);
        TextDecorations: TextDecorations;

        constructor () {
            super();
            TextReaction<TextDecorations>(Inline.TextDecorationsProperty, (upd, ov, nv, te?: TextElement) => {
                Incite(te, {
                    type: 'font',
                    full: upd.invalidateFont()
                });
            }, false, true, this);
        }

        Equals (inline: Inline): boolean {
            if (this.TextDecorations !== inline.TextDecorations)
                return false;
            return super.Equals(inline);
        }

        IsInheritable (propd: DependencyProperty): boolean {
            if (propd === Inline.TextDecorationsProperty)
                return true;
            return super.IsInheritable(propd);
        }
    }
    Fayde.CoreLibrary.add(Inline);
}