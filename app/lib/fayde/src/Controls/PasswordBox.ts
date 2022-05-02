/// <reference path="TextBoxBase.ts" />

module Fayde.Controls {
    export class PasswordBox extends TextBoxBase {
        static PasswordCharProperty = DependencyProperty.Register("PasswordChar", () => String, PasswordBox, String.fromCharCode(9679));
        static PasswordProperty = DependencyProperty.Register("Password", () => String, PasswordBox);
        PasswordChar: string;
        Password: string;

        constructor () {
            super(Text.EmitChangedType.TEXT);
            this.DefaultStyleKey = PasswordBox;

            var proxy = this.$Proxy;
            proxy.SyncSelectionStart = (value) => this.SetCurrentValue(PasswordBox.SelectionStartProperty, value);
            proxy.SyncSelectionLength = (value) => this.SetCurrentValue(PasswordBox.SelectionLengthProperty, value);
            proxy.SyncText = (value) => this.SetCurrentValue(PasswordBox.PasswordProperty, value);
            this.$Advancer = new Internal.PasswordBoxCursorAdvancer(this.$Proxy);
        }

        get DisplayText (): string {
            var result = "";
            var count = this.$Proxy.text.length;
            var pattern = this.PasswordChar;
            while (count > 0) {
                if (count & 1) result += pattern;
                count >>= 1, pattern += pattern;
            }
            return result;
        }

    }
    Fayde.CoreLibrary.add(PasswordBox);
    TemplateVisualStates(PasswordBox,
        { GroupName: "CommonStates", Name: "Normal" },
        { GroupName: "CommonStates", Name: "MouseOver" },
        { GroupName: "CommonStates", Name: "Disabled" },
        { GroupName: "FocusStates", Name: "Unfocused" },
        { GroupName: "FocusStates", Name: "Focused" },
        { GroupName: "ValidationStates", Name: "Valid" },
        { GroupName: "ValidationStates", Name: "InvalidUnfocused" },
        { GroupName: "ValidationStates", Name: "InvalidFocused" });

    module reactions {
        DPReaction<string>(PasswordBox.PasswordCharProperty, (pb: PasswordBox, ov, nv) => {
            pb.$View.setText(pb.DisplayText);
        }, false);
        DPReaction<string>(PasswordBox.PasswordProperty, (pb: PasswordBox, ov, nv) => {
            pb.$Proxy.setText(nv);
            pb.$View.setText(pb.DisplayText);
        }, false);
    }
}