module Fayde.Data {
    export interface ICollectionView extends nullstone.IEnumerable<any> {
        CurrentChanged: nullstone.Event<nullstone.IEventArgs>;
        CurrentItem: any;
        MoveCurrentTo(item: any): boolean;
    }
    export var ICollectionView_ = new nullstone.Interface<ICollectionView>("ICollectionView");
}