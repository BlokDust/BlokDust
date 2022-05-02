module Fayde.Documents {
    export class BlockCollection extends XamlObjectCollection<Block> {
        _RaiseItemAdded (value: Block, index: number) {
            Incite(this, {
                item: value,
                index: index,
                add: true
            });
        }

        _RaiseItemRemoved (value: Block, index: number) {
            Incite(this, {
                item: value,
                index: index,
                add: false
            });
        }
    }
    Fayde.CoreLibrary.add(BlockCollection);
}