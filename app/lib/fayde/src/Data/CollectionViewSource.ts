/// <reference path="../Core/DependencyObject.ts" />

module Fayde.Data {
    export class CollectionViewSource extends DependencyObject {
        static SourceProperty: DependencyProperty = DependencyProperty.Register("Source", () => Object, CollectionViewSource);
        static ViewProperty: DependencyProperty = DependencyProperty.Register("View", () => ICollectionView_, CollectionViewSource);
        Source: any;
        View: ICollectionView;
    }
}