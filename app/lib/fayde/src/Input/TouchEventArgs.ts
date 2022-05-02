/// <reference path="../Core/RoutedEventArgs.ts" />

module Fayde.Input {
    export class TouchEventArgs extends RoutedEventArgs {
        Device: ITouchDevice;
        constructor(device: ITouchDevice) {
            super();
            this.Device = device;
        }

        GetTouchPoint(relativeTo: UIElement): TouchPoint {
            return this.Device.GetTouchPoint(relativeTo);
        }
    }
    Fayde.CoreLibrary.add(TouchEventArgs);
}