/// <reference path="UIReaction.ts" />
/// <reference path="Providers/InheritedStore.ts" />
/// <reference path="../Primitives/Font.ts" />

module Fayde {
    export class InheritableOwner {
        static UseLayoutRoundingProperty = DependencyProperty.RegisterInheritable("UseLayoutRounding", () => Boolean, InheritableOwner, true);
        static FlowDirectionProperty = DependencyProperty.RegisterInheritable("FlowDirection", () => new Enum(minerva.FlowDirection), InheritableOwner, minerva.FlowDirection.LeftToRight);

        static ForegroundProperty = DependencyProperty.RegisterInheritable("Foreground", () => Media.Brush, InheritableOwner);
        static FontFamilyProperty = DependencyProperty.RegisterInheritable("FontFamily", () => String, InheritableOwner, Font.DEFAULT_FAMILY);
        static FontSizeProperty = DependencyProperty.RegisterInheritable("FontSize", () => Number, InheritableOwner, Font.DEFAULT_SIZE);
        static FontStretchProperty = DependencyProperty.RegisterInheritable("FontStretch", () => String, InheritableOwner, Font.DEFAULT_STRETCH);
        static FontStyleProperty = DependencyProperty.RegisterInheritable("FontStyle", () => String, InheritableOwner, Font.DEFAULT_STYLE);
        static FontWeightProperty = DependencyProperty.RegisterInheritable("FontWeight", () => new Enum(FontWeight), InheritableOwner, Font.DEFAULT_WEIGHT);
        static TextDecorationsProperty = DependencyProperty.RegisterInheritable("TextDecorations", () => new Enum(TextDecorations), InheritableOwner, TextDecorations.None);
        static LanguageProperty = DependencyProperty.RegisterInheritable("Language", () => String, InheritableOwner);

        static AllInheritedProperties: DependencyProperty[];
    }
    InheritableOwner.AllInheritedProperties = [
        InheritableOwner.ForegroundProperty,
        InheritableOwner.FontFamilyProperty,
        InheritableOwner.FontStretchProperty,
        InheritableOwner.FontStyleProperty,
        InheritableOwner.FontWeightProperty,
        InheritableOwner.FontSizeProperty,
        InheritableOwner.LanguageProperty,
        InheritableOwner.FlowDirectionProperty,
        InheritableOwner.UseLayoutRoundingProperty,
        InheritableOwner.TextDecorationsProperty
    ];
    Fayde.CoreLibrary.add(InheritableOwner);

    module reactions {
        UIReaction<boolean>(InheritableOwner.UseLayoutRoundingProperty, minerva.core.reactTo.useLayoutRounding, false);
        UIReaction<minerva.FlowDirection>(InheritableOwner.FlowDirectionProperty, minerva.core.reactTo.flowDirection, false);
    }
}