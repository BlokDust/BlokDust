module Fayde.Controls {
    import ScrollEx = Internal.ScrollEx;

    export class TreeView extends ItemsControl {
        static SelectedItemProperty = DependencyProperty.Register("SelectedItem", () => Object, TreeView, null, (d, args) => (<TreeView>d).OnSelectedItemChanged(args));
        static SelectedValueProperty = DependencyProperty.Register("SelectedValue", () => Object, TreeView, null, (d, args) => (<TreeView>d).OnSelectedValueChanged(args));
        static SelectedValuePathProperty = DependencyProperty.Register("SelectedValuePath", () => String, TreeView, "", (d, args) => (<TreeView>d).OnSelectedValuePathChanged(args));
        static ItemContainerStyleProperty = DependencyProperty.Register("ItemContainerStyle", () => Style, TreeView, null, (d, args) => (<TreeView>d).OnItemContainerStyleChanged(args));

        SelectedItem: any;
        SelectedValue: any;
        SelectedValuePath: string;
        ItemContainerStyle: Style;

        private OnSelectedItemChanged (e: DependencyPropertyChangedEventArgs) {
            if (this._IgnorePropertyChange)
                this._IgnorePropertyChange = false;
            else if (!this._AllowWrite) {
                this._IgnorePropertyChange = true;
                this.SetValue(TreeView.SelectedItemProperty, e.OldValue);
                throw new InvalidOperationException("Cannot set read-only property SelectedItem.");
            }
            else
                this.UpdateSelectedValue(e.NewValue);
        }

        private OnSelectedValueChanged (e: DependencyPropertyChangedEventArgs) {
            if (this._IgnorePropertyChange) {
                this._IgnorePropertyChange = false;
            } else {
                if (this._AllowWrite)
                    return;
                this._IgnorePropertyChange = true;
                this.SetValue(TreeView.SelectedValueProperty, e.OldValue);
                throw new InvalidOperationException("Cannot set read-only property SelectedValue.");
            }
        }

        private OnSelectedValuePathChanged (e: DependencyPropertyChangedEventArgs) {
            this.UpdateSelectedValue(this.SelectedItem);
        }

        private OnItemContainerStyleChanged (e: DependencyPropertyChangedEventArgs) {
            this.ItemsControlHelper.UpdateItemContainerStyle(<Style>e.NewValue);
        }

        private _AllowWrite: boolean;
        private _IgnorePropertyChange: boolean;

        SelectedContainer: TreeViewItem;
        IsSelectedContainerHookedUp: boolean;
        IsSelectionChangeActive: boolean;
        ItemsControlHelper: Internal.ItemsControlHelper;

        private SelectedItemChanged = new RoutedPropertyChangedEvent<any>();

        constructor () {
            super();
            this.DefaultStyleKey = TreeView;
            this.ItemsControlHelper = new Internal.ItemsControlHelper(this);
        }

        OnApplyTemplate () {
            super.OnApplyTemplate();
            this.ItemsControlHelper.OnApplyTemplate();
            this.UpdateVisualState(false);
        }

        GetContainerForItem (): UIElement {
            return new TreeViewItem();
        }

        IsItemItsOwnContainer (item: any): boolean {
            return item instanceof TreeViewItem;
        }

        PrepareContainerForItem (element: UIElement, item: any) {
            var treeViewItem = <TreeViewItem>element;
            if (treeViewItem instanceof TreeViewItem)
                treeViewItem.ParentItemsControl = this;
            Internal.ItemsControlHelper.PrepareContainerForItemOverride(element, this.ItemContainerStyle);
            HeaderedItemsControl.PrepareHeaderedItemsControlContainer(treeViewItem, item, this, this.ItemContainerStyle);
            super.PrepareContainerForItem(element, item);
        }

        ClearContainerForItem (element: UIElement, item: any) {
            var treeViewItem = <TreeViewItem>element;
            if (treeViewItem instanceof TreeViewItem)
                treeViewItem.ParentItemsControl = null;
            super.ClearContainerForItem(element, item);
        }

        OnItemsChanged (e: Collections.CollectionChangedEventArgs) {
            if (!e)
                throw new ArgumentException("e");
            super.OnItemsChanged(e);
            if (e.NewItems != null) {
                for (var i = 0, items = <TreeViewItem[]>e.NewItems, len = items.length; i < len; i++) {
                    items[i].ParentItemsControl = this;
                }
            }

            switch (e.Action) {
                case Collections.CollectionChangedAction.Remove:
                case Collections.CollectionChangedAction.Reset:
                    if (this.SelectedItem != null && !this.IsSelectedContainerHookedUp)
                        this.SelectFirstItem();
                    break;
                case Collections.CollectionChangedAction.Replace:
                    var selectedItem = this.SelectedItem;
                    if (selectedItem != null && (e.OldItems == null || nullstone.equals(selectedItem, e.OldItems[0])))
                        this.ChangeSelection(selectedItem, this.SelectedContainer, false);
                    break;
            }

            if (!e.OldItems)
                return;
            for (var i = 0, items = <TreeViewItem[]>e.OldItems, len = items.length; i < len; i++) {
                items[i].ParentItemsControl = null;
            }
        }

        CheckForSelectedDescendents (item: TreeViewItem) {
            var stack: TreeViewItem[] = [];
            stack.push(item);
            while (stack.length > 0) {
                var container = stack.pop();
                if (container.IsSelected) {
                    container.IgnorePropertyChange = true;
                    container.IsSelected = false;
                    this.ChangeSelection(container, container, true);
                    if (this.SelectedContainer.ParentItemsControl == null)
                        this.SelectedContainer.RequiresContainsSelectionUpdate = true;
                }
                var enumerator = container.Items.getEnumerator();
                while (enumerator.moveNext())
                    stack.push(enumerator.current);
            }
        }

        PropagateKeyDown (e: Input.KeyEventArgs) {
            this.OnKeyDown(e);
        }

        OnKeyDown (e: Input.KeyEventArgs) {
            super.OnKeyDown(e);
            if (e.Handled || !this.IsEnabled)
                return;
            if (Input.Keyboard.HasControl()) {
                switch (e.Key) {
                    case Input.Key.PageUp:
                    case Input.Key.PageDown:
                    case Input.Key.End:
                    case Input.Key.Home:
                    case Input.Key.Left:
                    case Input.Key.Up:
                    case Input.Key.Right:
                    case Input.Key.Down:
                        if (ScrollEx.HandleKey(this.ItemsControlHelper.ScrollHost, e.Key, this.FlowDirection))
                            e.Handled = true;
                        break;
                }
            } else {
                switch (e.Key) {
                    case Input.Key.PageUp:
                    case Input.Key.PageDown:
                        if (this.SelectedContainer != null) {
                            if (!this.HandleScrollByPage(e.Key === Input.Key.PageUp))
                                break;
                            e.Handled = true;
                            break;
                        }
                        else {
                            if (!this.FocusFirstItem())
                                break;
                            e.Handled = true;
                            break;
                        }
                    case Input.Key.End:
                        if (!this.FocusLastItem())
                            break;
                        e.Handled = true;
                        break;
                    case Input.Key.Home:
                        if (!this.FocusFirstItem())
                            break;
                        e.Handled = true;
                        break;
                    case Input.Key.Up:
                    case Input.Key.Down:
                        if (this.SelectedContainer != null || !this.FocusFirstItem())
                            break;
                        e.Handled = true;
                        break;
                }
            }
        }

        private HandleScrollByPage (up: boolean): boolean {
            var scrollHost = this.ItemsControlHelper.ScrollHost;
            if (scrollHost != null) {
                var viewportHeight = scrollHost.ViewportHeight;
                var top: IOutValue = {Value: 0};
                var bottom: IOutValue = {Value: 0};
                ScrollEx.GetTopAndBottom(this.SelectedContainer.HeaderElement || this.SelectedContainer, scrollHost, top, bottom);
                var tvi1: TreeViewItem = null;
                var tvi2 = this.SelectedContainer;
                var itemsControl = this.SelectedContainer.ParentItemsControl;
                if (itemsControl != null) {
                    if (up) {
                        for (var parentItemsControl; itemsControl !== this; itemsControl = parentItemsControl) {
                            var tvi3 = <TreeViewItem>itemsControl;
                            if (tvi3 != null) {
                                parentItemsControl = tvi3.ParentItemsControl;
                                if (!parentItemsControl)
                                    break;
                                tvi2 = tvi3;
                            }
                            break;
                        }
                    }
                    var index = itemsControl.ItemContainersManager.IndexFromContainer(tvi2);
                    var count = itemsControl.Items.Count;
                    while (itemsControl != null && tvi2 != null) {
                        if (tvi2.IsEnabled) {
                            var currentDelta: IOutValue = {Value: 0};
                            if (tvi2.HandleScrollByPage(up, scrollHost, viewportHeight, top.Value, bottom.Value, currentDelta))
                                return true;
                            if (NumberEx.IsGreaterThanClose(currentDelta.Value, viewportHeight)) {
                                if (tvi1 === this.SelectedContainer || tvi1 == null) {
                                    if (!up)
                                        return this.SelectedContainer.HandleDownKey();
                                    return this.SelectedContainer.HandleUpKey();
                                }
                                break;
                            } else
                                tvi1 = tvi2;
                        }
                        index += up ? -1 : 1;
                        if (0 <= index && index < count) {
                            tvi2 = <TreeViewItem>itemsControl.ItemContainersManager.ContainerFromIndex(index);
                            if (!(tvi2 instanceof TreeViewItem)) tvi2 = null;
                        } else if (itemsControl === this) {
                            tvi2 = null;
                        } else {
                            while (itemsControl != null) {
                                var tvi3 = itemsControl instanceof TreeViewItem ? <TreeViewItem>itemsControl : null;
                                itemsControl = tvi3.ParentItemsControl;
                                if (itemsControl != null) {
                                    count = itemsControl.Items.Count;
                                    index = itemsControl.ItemContainersManager.IndexFromContainer(tvi3) + (up ? -1 : 1);
                                    if (index > -1 && index < count) {
                                        tvi2 = <TreeViewItem>itemsControl.ItemContainersManager.ContainerFromIndex(index);
                                        if (!(tvi2 instanceof TreeViewItem)) tvi2 = null;
                                        break;
                                    }
                                    else if (itemsControl == this) {
                                        tvi2 = null;
                                        itemsControl = null;
                                    }
                                }
                            }
                        }
                    }
                }
                if (tvi1 != null) {
                    if (up) {
                        if (tvi1 !== this.SelectedContainer)
                            return tvi1.Focus();
                    } else
                        tvi1.FocusInto();
                }
            }
            return false;
        }

        OnMouseEnter (e: Input.MouseEventArgs) {
            super.OnMouseEnter(e);
            this.UpdateVisualState();
        }

        OnMouseLeave (e: Input.MouseEventArgs) {
            super.OnMouseLeave(e);
            this.UpdateVisualState();
        }

        OnMouseMove (e: Input.MouseEventArgs) {
            super.OnMouseMove(e);
            this.UpdateVisualState();
        }

        OnMouseLeftButtonDown (e: Input.MouseButtonEventArgs) {
            super.OnMouseLeftButtonDown(e);
            if (!e.Handled && this.HandleMouseButtonDown())
                e.Handled = true;
            this.UpdateVisualState();
        }

        HandleMouseButtonDown (): boolean {
            if (!this.SelectedContainer)
                return false;
            if (!this.SelectedContainer.IsFocused)
                this.SelectedContainer.Focus();
            return true;
        }

        OnMouseLeftButtonUp (e: Input.MouseButtonEventArgs) {
            super.OnMouseLeftButtonUp(e);
            this.UpdateVisualState();
        }

        OnGotFocus (e: RoutedEventArgs) {
            super.OnGotFocus(e);
            this.UpdateVisualState();
        }

        OnLostFocus (e: RoutedEventArgs) {
            super.OnLostFocus(e);
            this.UpdateVisualState();
        }

        ChangeSelection (itemOrContainer: any, container: TreeViewItem, selected: boolean) {
            if (this.IsSelectionChangeActive)
                return;
            var oldValue = null;
            var newValue = null;
            var flag = false;
            var selContainer = this.SelectedContainer;
            this.IsSelectionChangeActive = true;
            try {
                if (selected && container !== selContainer) {
                    oldValue = this.SelectedItem;
                    if (selContainer != null) {
                        selContainer.IsSelected = false;
                        selContainer.UpdateContainsSelection(false);
                    }
                    newValue = itemOrContainer;
                    this.SelectedContainer = container;
                    this.SelectedContainer.UpdateContainsSelection(true);
                    this.SelectedItem = itemOrContainer;
                    this.UpdateSelectedValue(itemOrContainer);
                    flag = true;
                    this.ItemsControlHelper.ScrollIntoView(container.HeaderElement || container);
                } else if (!selected && container === selContainer) {
                    this.SelectedContainer.UpdateContainsSelection(false);
                    this.SelectedContainer = null;
                    this.SelectedItem = null;
                    this.SelectedValue = null;
                    oldValue = itemOrContainer;
                    flag = true;
                }
                container.IsSelected = selected;
            } finally {
                this.IsSelectionChangeActive = false;
            }
            if (!flag)
                return;
            this.SelectedItemChanged.raise(this, new RoutedPropertyChangedEventArgs<any>(oldValue, newValue));
        }

        private UpdateSelectedValue (item: any) {
            if (!item) {
                this.ClearValue(TreeView.SelectedValueProperty);
                return;
            }

            var selectedValuePath = this.SelectedValuePath;
            if (!selectedValuePath) {
                this.SelectedValue = item;
            } else {
                var binding = new Data.Binding(selectedValuePath);
                binding.Source = item;
                var contentControl = new ContentControl();
                contentControl.SetBinding(ContentControl.ContentProperty, binding);
                this.SelectedValue = contentControl.Content;
                contentControl.ClearValue(ContentControl.ContentProperty);
            }
        }

        private SelectFirstItem () {
            var container = <TreeViewItem>this.ItemContainersManager.ContainerFromIndex(0);
            var selected = container instanceof TreeViewItem;
            if (!selected)
                container = this.SelectedContainer;
            this.ChangeSelection(selected ? this.ItemContainersManager.ItemFromContainer(container) : this.SelectedItem, container, selected);
        }

        private FocusFirstItem (): boolean {
            var tvi = <TreeViewItem>this.ItemContainersManager.ContainerFromIndex(0);
            if (!tvi)
                return false;
            if (!tvi.IsEnabled || !tvi.Focus())
                return tvi.FocusDown();
            return true;
        }

        private FocusLastItem (): boolean {
            for (var index = this.Items.Count - 1; index >= 0; --index) {
                var tvi = <TreeViewItem>this.ItemContainersManager.ContainerFromIndex(index);
                if (tvi instanceof TreeViewItem && tvi.IsEnabled)
                    return tvi.FocusInto();
            }
            return false;
        }
    }
    TemplateVisualStates(TreeView,
        {GroupName: "CommonStates", Name: "Normal"},
        {GroupName: "CommonStates", Name: "MouseOver"},
        {GroupName: "CommonStates", Name: "Disabled"},
        {GroupName: "FocusStates", Name: "Unfocused"},
        {GroupName: "FocusStates", Name: "Focused"},
        {GroupName: "ValidationStates", Name: "Valid"},
        {GroupName: "ValidationStates", Name: "InvalidUnfocused"},
        {GroupName: "ValidationStates", Name: "InvalidFocused"});

    Object.defineProperty(TreeView.prototype, "SelectedValue", {
        get: function () {
            return this.GetValue(TreeView.SelectedValueProperty);
        },
        set: function (value: any) {
            try {
                this._AllowWrite = true;
                this.SetValue(TreeView.SelectedValueProperty, value);
            } finally {
                this._AllowWrite = false;
            }
        }
    });

    Object.defineProperty(TreeView.prototype, "SelectedItem", {
        get: function () {
            return this.GetValue(TreeView.SelectedItemProperty);
        },
        set: function (value: any) {
            try {
                this._AllowWrite = true;
                this.SetValue(TreeView.SelectedItemProperty, value);
            } finally {
                this._AllowWrite = false;
            }
        }
    });
}