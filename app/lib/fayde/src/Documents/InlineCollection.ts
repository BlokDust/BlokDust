module Fayde.Documents {
    export class InlineCollection extends XamlObjectCollection<Inline> {
        _RaiseItemAdded (value: Inline, index: number) {
            Incite(this, {
                item: value,
                index: index,
                add: true
            });
        }

        _RaiseItemRemoved (value: Inline, index: number) {
            Incite(this, {
                item: value,
                index: index,
                add: false
            });
        }
    }
    Fayde.CoreLibrary.add(InlineCollection);
}