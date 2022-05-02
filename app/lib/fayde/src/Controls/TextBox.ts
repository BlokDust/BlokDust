/// <reference path="TextBoxBase.ts" />

module Fayde.Controls {
    export class TextBox extends TextBoxBase {
        static AcceptsReturnProperty = DependencyProperty.Register("AcceptsReturn", () => Boolean, TextBox, false);
        static IsReadOnlyProperty = DependencyProperty.Register("IsReadOnly", () => Boolean, TextBox, false);
        static TextProperty = DependencyProperty.Register("Text", () => String, TextBox);
        static TextAlignmentProperty = DependencyProperty.Register("TextAlignment", () => new Enum(TextAlignment), TextBox, TextAlignment.Left);
        static TextWrappingProperty = DependencyProperty.Register("TextWrapping", () => new Enum(TextWrapping), TextBox, TextWrapping.NoWrap);
        static HorizontalScrollBarVisibilityProperty = DependencyProperty.Register("HorizontalScrollBarVisibility", () => new Enum(ScrollBarVisibility), TextBox, ScrollBarVisibility.Hidden);
        static VerticalScrollBarVisibilityProperty = DependencyProperty.Register("VerticalScrollBarVisibility", () => new Enum(ScrollBarVisibility), TextBox, ScrollBarVisibility.Hidden);
        AcceptsReturn: boolean;
        IsReadOnly: boolean;
        Text: string;
        TextAlignment: TextAlignment;
        TextWrapping: TextWrapping;
        HorizontalScrollBarVisibility: ScrollBarVisibility;
        VerticalScrollBarVisibility: ScrollBarVisibility;

        TextChanged = new RoutedEvent<RoutedEventArgs>();

        constructor () {
            super(Text.EmitChangedType.TEXT | Text.EmitChangedType.SELECTION);
            this.DefaultStyleKey = TextBox;

            var proxy = this.$Proxy;
            proxy.SyncSelectionStart = (value) => this.SetCurrentValue(TextBox.SelectionStartProperty, value);
            proxy.SyncSelectionLength = (value) => this.SetCurrentValue(TextBox.SelectionLengthProperty, value);
            proxy.SyncText = (value) => {
                this.SetCurrentValue(TextBox.TextProperty, value);
                var args = new RoutedEventArgs();
                args.Source = this;
                this.TextChanged.raise(this, args);
            };
            this.$Advancer = new Internal.TextBoxCursorAdvancer(this.$Proxy);
        }

        OnApplyTemplate () {
            super.OnApplyTemplate();
            var vis = (this.TextWrapping === TextWrapping.Wrap) ? ScrollBarVisibility.Disabled : this.HorizontalScrollBarVisibility;
            this.$ContentProxy.setHorizontalScrollBar(vis);
            this.$ContentProxy.setVerticalScrollBar(this.VerticalScrollBarVisibility);
        }

        get DisplayText (): string {
            return this.Text;
        }

        OnMouseEnter (e: Input.MouseEventArgs) {
            super.OnMouseEnter(e);
            this.UpdateVisualState();
        }

        OnMouseLeave (e: Input.MouseEventArgs) {
            super.OnMouseLeave(e);
            this.UpdateVisualState();
        }

        OnGotFocus (e: RoutedEventArgs) {
            super.OnGotFocus(e);
            this.UpdateVisualState();
        }

        OnLostFocus (e: RoutedEventArgs) {
            super.OnLostFocus(e);
            this.UpdateVisualState();
        }

        GoToStateCommon (gotoFunc: (state: string) => boolean): boolean {
            if (!this.IsEnabled)
                return gotoFunc("Disabled");
            if (this.IsReadOnly)
                return gotoFunc("ReadOnly");
            if (this.IsMouseOver)
                return gotoFunc("MouseOver");
            return gotoFunc("Normal");
        }

        SelectAll () {
            this.$Proxy.selectAll();
        }

        Select (start: number, length: number) {
            this.$Proxy.select(start, length);
        }
    }
    Fayde.CoreLibrary.add(TextBox);
    TemplateVisualStates(TextBox,
        {GroupName: "CommonStates", Name: "Normal"},
        {GroupName: "CommonStates", Name: "MouseOver"},
        {GroupName: "CommonStates", Name: "Disabled"},
        {GroupName: "CommonStates", Name: "ReadOnly"},
        {GroupName: "FocusStates", Name: "Unfocused"},
        {GroupName: "FocusStates", Name: "Focused"},
        {GroupName: "ValidationStates", Name: "Valid"},
        {GroupName: "ValidationStates", Name: "InvalidUnfocused"},
        {GroupName: "ValidationStates", Name: "InvalidFocused"});
    TemplateParts(TextBox,
        {Name: "ContentElement", Type: FrameworkElement});

    module reactions {
        DPReaction<boolean>(TextBox.AcceptsReturnProperty, (tb: TextBox, ov, nv) => {
            tb.$Proxy.acceptsReturn = nv === true;
        }, false);
        DPReaction<boolean>(TextBox.IsReadOnlyProperty, (tb: TextBox, ov, nv) => {
            tb.$View.setIsReadOnly(nv === true);
        }, false);
        DPReaction<TextAlignment>(TextBox.TextAlignmentProperty, (tb: TextBox, ov, nv) => tb.$View.setTextAlignment(nv), false);
        DPReaction<TextWrapping>(TextBox.TextWrappingProperty, (tb: TextBox, ov, nv) => {
            var vis = (nv === TextWrapping.Wrap) ? ScrollBarVisibility.Disabled : tb.HorizontalScrollBarVisibility;
            tb.$ContentProxy.setHorizontalScrollBar(vis);
            tb.$View.setTextWrapping(nv);
        }, false);
        DPReaction<ScrollBarVisibility>(TextBox.HorizontalScrollBarVisibilityProperty, (tb: TextBox, ov, nv) => {
            var vis = (tb.TextWrapping === TextWrapping.Wrap) ? ScrollBarVisibility.Disabled : tb.HorizontalScrollBarVisibility;
            tb.$ContentProxy.setHorizontalScrollBar(vis);
        }, false);
        DPReaction<ScrollBarVisibility>(TextBox.VerticalScrollBarVisibilityProperty, (tb: TextBox, ov, nv) => {
            tb.$ContentProxy.setVerticalScrollBar(nv);
        }, false);
        DPReaction<string>(TextBox.TextProperty, (tb: TextBox, ov, nv) => {
            tb.$Proxy.setText(nv);
            tb.$View.setText(tb.DisplayText);
        }, false);
    }
}