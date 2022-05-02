/// <reference path="RoutedEventArgs.ts" />

module Fayde {
    export class SizeChangedEventArgs extends RoutedEventArgs {
        PreviousSize: minerva.Size;
        NewSize: minerva.Size;

        constructor(previousSize: minerva.Size, newSize: minerva.Size) {
            super();

            Object.defineProperty(this, "PreviousSize", { value: new minerva.Size(), writable: false });
            Object.defineProperty(this, "NewSize", { value: new minerva.Size(), writable: false });

            minerva.Size.copyTo(previousSize, this.PreviousSize);
            minerva.Size.copyTo(newSize, this.NewSize);
        }
    }
    Fayde.CoreLibrary.add(SizeChangedEventArgs);
}