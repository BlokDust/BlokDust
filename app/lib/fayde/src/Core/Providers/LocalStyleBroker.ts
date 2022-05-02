
module Fayde.Providers {
    export interface IStyleHolder {
        _LocalStyle: Style;
    }

    export class LocalStyleBroker {
        static Set(fe: FrameworkElement, newStyle: Style) {
            var holder = <IStyleHolder>fe.XamlNode;
            if (newStyle)
                newStyle.Seal();
            SwapStyles(fe, SingleStyleWalker(holder._LocalStyle), SingleStyleWalker(newStyle), false);
            holder._LocalStyle = newStyle;
        }
    }
}