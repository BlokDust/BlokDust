module Fayde {
    export class RoutedEvent<T extends RoutedEventArgs> extends nullstone.Event<T> {
    }
    Fayde.CoreLibrary.add(RoutedEvent);
}