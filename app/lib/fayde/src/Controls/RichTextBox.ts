/// <reference path="Control.ts" />

module Fayde.Controls {
    export class _RichTextBoxView {
    }
    Fayde.RegisterType(_RichTextBoxView, Fayde.XMLNSINTERNAL);

    export class RichTextBox extends Control {
        HorizontalScrollBarVisibility: ScrollBarVisibility;
        TextWrapping: TextWrapping;

        constructor() {
            super();
            this.DefaultStyleKey = RichTextBox;
        }
    }
    Fayde.CoreLibrary.add(RichTextBox);
}