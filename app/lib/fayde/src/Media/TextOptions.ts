/// <reference path="../Core/DependencyObject.ts" />

module Fayde.Media {
    export class TextOptions {
        static TextHintingModeProperty: DependencyProperty = DependencyProperty.RegisterAttached("TextHintingMode", () => new Enum(TextHintingMode), TextOptions);
        static GetTextHintingMode(d: DependencyObject): TextHintingMode { return d.GetValue(TextOptions.TextHintingModeProperty); }
        static SetTextHintingMode(d: DependencyObject, value: TextHintingMode) { d.SetValue(TextOptions.TextHintingModeProperty, value); }
    }
    Fayde.CoreLibrary.add(TextOptions);
}