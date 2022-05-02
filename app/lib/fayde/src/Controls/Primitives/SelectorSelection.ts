module Fayde.Controls.Primitives {
    export class SelectorSelection {
        private _Owner: Selector;
        private _SelectedItems: any[] = [];
        private _SelectedItem: any = null;
        private _IsUpdating: boolean = false;
        private _AnchorIndex = -1;
        Mode: SelectionMode = SelectionMode.Single;

        get IsUpdating(): boolean { return this._IsUpdating; }

        constructor(owner: Selector) {
            this._Owner = owner;
            this._Owner.SelectedItems.CollectionChanged.on(this._HandleOwnerSelectionChanged, this);
        }

        private _HandleOwnerSelectionChanged(sender, e: Collections.CollectionChangedEventArgs) {
            if (this._IsUpdating)
                return;
            if (this.Mode === SelectionMode.Single)
                throw new InvalidOperationException("SelectedItems cannot be modified directly when in Single select mode");
            try {
                var items = this._SelectedItems;
                this._IsUpdating = true;
                switch (e.Action) {
                    case Collections.CollectionChangedAction.Add:
                        if (items.indexOf(e.NewItems[0]) < 0)
                            this.AddToSelected(e.NewItems[0]);
                        break;
                    case Collections.CollectionChangedAction.Remove:
                        if (items.indexOf(e.OldItems[0]) > -1)
                            this.RemoveFromSelected(e.OldItems[0]);
                        break;
                    case Collections.CollectionChangedAction.Replace:
                        if (items.indexOf(e.OldItems[0]) > -1)
                            this.RemoveFromSelected(e.OldItems[0]);
                        if (items.indexOf(e.NewItems[0]) < 0)
                            this.AddToSelected(e.NewItems[0]);
                        break;
                    case Collections.CollectionChangedAction.Reset:
                        var ownerItems = this._Owner.SelectedItems;

                        var item: any;
                        var enumerator = ownerItems.getEnumerator();
                        while (enumerator.moveNext()) {
                            item = enumerator.current;
                            if (ownerItems.Contains(item))
                                continue;
                            if (items.indexOf(item) > -1)
                                this.RemoveFromSelected(item);
                        }

                        enumerator = ownerItems.getEnumerator();
                        while (enumerator.moveNext()) {
                            item = enumerator.current;
                            if (items.indexOf(item) < 0)
                                this.AddToSelected(item);
                        }
                        break;
                }

                this._Owner._SelectedItemsIsInvalid = true;
            } finally {
                this._IsUpdating = false;
            }
        }
        RepopulateSelectedItems() {
            if (!this._IsUpdating) {
                try {
                    this._IsUpdating = true;
                    var si = this._Owner.SelectedItems;
                    si.Clear();
                    si.AddRange(this._SelectedItems);
                } finally {
                    this._IsUpdating = false;
                }
            }
        }
        ClearSelection(ignoreSelectedValue?: boolean) {
            if (ignoreSelectedValue === undefined) ignoreSelectedValue = false;
            if (this._SelectedItems.length === 0) {
                this.UpdateSelectorProperties(null, -1, ignoreSelectedValue ? this._Owner.SelectedValue : null);
                return;
            }

            try {
                this._IsUpdating = true
                var oldSelection = this._SelectedItems.slice(0);

                this._SelectedItems = [];
                this._SelectedItem = null;
                this.UpdateSelectorProperties(null, -1, ignoreSelectedValue ? this._Owner.SelectedValue : null);

                this._Owner._SelectedItemsIsInvalid = true;
                this._Owner._RaiseSelectionChanged(oldSelection, []);
            } finally {
                this._IsUpdating = false;
            }
        }
        Select(item: any) {
            if (!this._Owner.Items.Contains(item))
                return;

            var selIndex = this._SelectedItems.indexOf(item);
            try {
                this._IsUpdating = true;

                switch (this.Mode) {
                    case SelectionMode.Single:
                        return this._SelectSingle(item, selIndex);
                    case SelectionMode.Extended:
                        return this._SelectExtended(item, selIndex);
                    case SelectionMode.Multiple:
                        return this._SelectMultiple(item, selIndex);
                    default:
                        throw new NotSupportedException("SelectionMode " + this.Mode + " is not supported.");
                }
            } finally {
                this._IsUpdating = false;
            }
        }
        private _SelectSingle(item: any, selIndex: number) {
            if (selIndex === -1)
                return this.ReplaceSelection(item);
        }
        private _SelectExtended(item: any, selIndex: number) {
            var itemsIndex = this._Owner.Items.IndexOf(item);
            if (Fayde.Input.Keyboard.HasShift()) {
                var items = this._Owner.Items;
                var aIndex = this._AnchorIndex;
                if (aIndex === -1)
                    aIndex = items.IndexOf(this._SelectedItem);
                aIndex = Math.max(aIndex, 0);
                var oIndex = items.IndexOf(item);
                return this.SelectRange(Math.min(aIndex, oIndex), Math.max(aIndex, oIndex));
            }

            this._AnchorIndex = selIndex;
            if (Fayde.Input.Keyboard.HasControl()) {
                if (selIndex > -1)
                    return this.RemoveFromSelected(item);
                return this.AddToSelected(item);
            }
            return this.ReplaceSelection(item);
        }
        private _SelectMultiple(item: any, selIndex: number) {
            return (selIndex > -1) ? this.RemoveFromSelected(item) : this.AddToSelected(item);
        }
        SelectRange(startIndex: number, endIndex: number) {
            var ownerItems = this._Owner.Items;

            var oldSelectedItems = this._SelectedItems;
            this._SelectedItems = ownerItems.GetRange(startIndex, endIndex)

            var toUnselect = except(oldSelectedItems, this._SelectedItems);
            var toSelect = except(this._SelectedItems, oldSelectedItems);

            if (this._SelectedItems.indexOf(this._SelectedItem) === -1) {
                this._SelectedItem = this._SelectedItems[0];
                this.UpdateSelectorProperties(this._SelectedItem, this._SelectedItem == null ? -1 : ownerItems.IndexOf(this._SelectedItem), this._Owner._GetValueFromItem(this._SelectedItem));
            }

            this._Owner._SelectedItemsIsInvalid = true;
            this._Owner._RaiseSelectionChanged(toUnselect, toSelect);
        }
        SelectAll(items: any[]) {
            try {
                this._IsUpdating = true;
                if (this.Mode === SelectionMode.Single)
                    throw new NotSupportedException("Cannot call SelectAll when in Single select mode");

                var selectedItems = this._SelectedItems;
                var select = except(items, selectedItems);
                if (select.length === 0)
                    return;

                var owner = this._Owner;
                selectedItems.push(select);
                if (this._SelectedItem == null) {
                    this._SelectedItem = select[0];
                    this.UpdateSelectorProperties(this._SelectedItem, owner.Items.IndexOf(this._SelectedItem), owner._GetValueFromItem(this._SelectedItem));
                }

                owner._SelectedItemsIsInvalid = true;
                owner._RaiseSelectionChanged([], select);
            } finally {
                this._IsUpdating = false;
            }
        }
        SelectOnly(item: any) {
            if (this._SelectedItem === item && this._SelectedItems.length === 1)
                return;

            try {
                this._IsUpdating = true;
                this.ReplaceSelection(item);
            } finally {
                this._IsUpdating = false;
            }
        }
        Unselect(item: any) {
            if (this._SelectedItems.indexOf(item) < 0)
                return;

            try {
                this._IsUpdating = true;
                this.RemoveFromSelected(item);
            } finally {
                this._IsUpdating = false;
            }
        }
        AddToSelected(item: any) {
            this._SelectedItems.push(item);
            var owner = this._Owner;
            if (this._SelectedItems.length === 1) {
                this._SelectedItem = item;
                this.UpdateSelectorProperties(item, owner.Items.IndexOf(item), owner._GetValueFromItem(item));
            }
            owner._SelectedItemsIsInvalid = true;
            owner._RaiseSelectionChanged([], [item]);
        }
        RemoveFromSelected(item: any) {
            var selectedItems = this._SelectedItems;
            var index = selectedItems.indexOf(item);
            if (index > -1) selectedItems.splice(index, 1);
            var owner = this._Owner;
            if (this._SelectedItem === item) {
                var newItem = selectedItems[0];
                this._SelectedItem = newItem;
                this.UpdateSelectorProperties(newItem, newItem == null ? -1 : owner.Items.IndexOf(newItem), owner._GetValueFromItem(item));
            }
            owner._SelectedItemsIsInvalid = true;
            owner._RaiseSelectionChanged([item], []);
        }
        ReplaceSelection(item: any) {
            var owner = this._Owner;
            if (!this.UpdateCollectionView(item)) {
                this.UpdateSelectorProperties(this._SelectedItem, owner.Items.IndexOf(this._SelectedItem), owner._GetValueFromItem(this._SelectedItem));
                return;
            }

            var oldItems = this._SelectedItems.slice(0);
            var newItems = [];
            var itemIndex = oldItems.indexOf(item);
            if (itemIndex > -1) {
                oldItems.splice(itemIndex, 1);
            } else {
                newItems.push(item);
            }
            this._SelectedItems = [item];

            this._SelectedItem = item;
            this.UpdateSelectorProperties(item, owner.Items.IndexOf(item), owner._GetValueFromItem(item));

            if (newItems.length !== 0 || oldItems.length !== 0) {
                owner._SelectedItemsIsInvalid = true;
                owner._RaiseSelectionChanged(oldItems, newItems);
            }
        }
        UpdateSelectorProperties(item: any, index: number, value: any) {
            var owner = this._Owner;
            if (owner.SelectedItem !== item)
                owner.SelectedItem = item;

            if (owner.SelectedIndex !== index)
                owner.SelectedIndex = index;

            if (owner.SelectedValue !== value)
                owner.SelectedValue = value;

            this.UpdateCollectionView(item);
        }
        UpdateCollectionView(item: any) {
            var icv = Data.ICollectionView_.as(this._Owner.ItemsSource);
            if (icv) {
                icv.MoveCurrentTo(item);
                return item === icv.CurrentItem;
            }
            return true;
        }
    }
    Fayde.CoreLibrary.add(SelectorSelection);

    function except<T>(arr1: T[], arr2: T[]): T[] {
        var r = [];
        var c: any;
        for (var i = 0, len = arr1.length; i < len; i++) {
            c = arr1[i];
            if (arr2.indexOf(c) < 0)
                r.push(c);
        }
        return r;
    }
}