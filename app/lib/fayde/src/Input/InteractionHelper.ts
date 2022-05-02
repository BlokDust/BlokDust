
module Fayde.Input {
    export module InteractionHelper {
        export function GetLogicalKey(flowDirection: FlowDirection, key: Key): Key {
            if (flowDirection !== FlowDirection.RightToLeft)
                return key;
            switch (key) {
                case Key.Left:
                    return Key.Right;
                case Key.Right:
                    return Key.Left;
                default:
                    return key;
            }
        }
    }
}