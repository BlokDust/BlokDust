module Fayde.Controls {
    import ScrollExtensions = Internal.ScrollEx;

    export class TreeViewItem extends HeaderedItemsControl {
        static HasItemsProperty = DependencyProperty.RegisterReadOnly("HasItems", () => Boolean, TreeViewItem, false, (d, args) => (<TreeViewItem>d).OnHasItemsChanged(args));
        static IsExpandedProperty = DependencyProperty.Register("IsExpanded", () => Boolean, TreeViewItem, false, (d, args) => (<TreeViewItem>d).OnIsExpandedPropertyChanged(args));
        static IsSelectedProperty = DependencyProperty.Register("IsSelected", () => Boolean, TreeViewItem, false, (d, args) => (<TreeViewItem>d).OnIsSelectedChanged(args));
        static IsSelectionActiveProperty = DependencyProperty.RegisterReadOnly("IsSelectionActive", () => Boolean, TreeViewItem, false, (d, args) => (<TreeViewItem>d).OnIsSelectionActiveChanged(args));

        HasItems: boolean;
        private $SetHasItems(value: boolean) {
            try {
                this._AllowWrite = true;
                this.SetCurrentValue(TreeViewItem.HasItemsProperty, value);
            } finally {
                this._AllowWrite = false;
            }
        }
        IsExpanded: boolean;
        IsSelected: boolean;
        IsSelectionActive: boolean;
        private $SetIsSelectionActive(value: boolean) {
            try {
                this._AllowWrite = true;
                this.SetCurrentValue(TreeViewItem.IsSelectionActiveProperty, value === true);
            } finally {
                this._AllowWrite = false;
            }
        }

        private OnHasItemsChanged(e: DependencyPropertyChangedEventArgs) {
            if (this.IgnorePropertyChange)
                this.IgnorePropertyChange = false;
            else if (!this._AllowWrite) {
                this.IgnorePropertyChange = true;
                this.SetCurrentValue(TreeViewItem.HasItemsProperty, e.OldValue);
                throw new InvalidOperationException("Cannot set read-only property HasItems.");
            } else
                this.UpdateVisualState();
        }
        private OnIsExpandedPropertyChanged(e: DependencyPropertyChangedEventArgs) {
            var newValue = e.NewValue === true;
            if (newValue)
                this.OnExpanded(new RoutedEventArgs());
            else
                this.OnCollapsed(new RoutedEventArgs());
            if (newValue) {
                if (this.ExpansionStateGroup != null || !this.UserInitiatedExpansion)
                    return;
                this.UserInitiatedExpansion = false;
                var parentTreeView = this.ParentTreeView;
                if (!parentTreeView)
                    return;
                parentTreeView.ItemsControlHelper.ScrollIntoView(this);
            } else {
                if (!this.ContainsSelection)
                    return;
                this.Focus();
            }
        }
        private OnIsSelectedChanged(e: DependencyPropertyChangedEventArgs) {
            if (this.IgnorePropertyChange) {
                this.IgnorePropertyChange = false;
            } else if (e.NewValue === true) {
                this.Select(true);
                this.OnSelected(new RoutedEventArgs());
            } else {
                this.Select(false);
                this.OnUnselected(new RoutedEventArgs());
            }
        }
        private OnIsSelectionActiveChanged(e: DependencyPropertyChangedEventArgs) {
            if (this.IgnorePropertyChange)
                this.IgnorePropertyChange = false;
            else if (!this._AllowWrite) {
                this.IgnorePropertyChange = true;
                this.SetValueInternal(TreeViewItem.IsSelectionActiveProperty, e.OldValue);
                throw new InvalidOperationException("Cannot set read-only property IsSelectionActive.");
            } else
                this.UpdateVisualState();
        }

        Collapsed = new RoutedEvent<RoutedEventArgs>();
        Expanded = new RoutedEvent<RoutedEventArgs>();
        Selected = new RoutedEvent<RoutedEventArgs>();
        Unselected = new RoutedEvent<RoutedEventArgs>();

        private _AllowWrite = false;
        IgnorePropertyChange: boolean;
        private ContainsSelection: boolean;
        private CancelGotFocusBubble: boolean;
        RequiresContainsSelectionUpdate: boolean;
        private UserInitiatedExpansion: boolean;

        private _expanderButton: Primitives.ToggleButton;
        private get ExpanderButton(): Primitives.ToggleButton { return this._expanderButton; }
        private set ExpanderButton(value: Primitives.ToggleButton) {
            if (this._expanderButton) {
                this._expanderButton.Click.off(this.OnExpanderClick, this);
                this._expanderButton.GotFocus.off(this.OnExpanderGotFocus, this);
            }
            this._expanderButton = value;
            if (this._expanderButton) {
                this._expanderButton.IsChecked = this.IsExpanded;
                this._expanderButton.Click.on(this.OnExpanderClick, this);
                this._expanderButton.GotFocus.on(this.OnExpanderGotFocus, this);
            }
        }

        private _headerElement: FrameworkElement;
        get HeaderElement(): FrameworkElement { return this._headerElement; }
        set HeaderElement(value: FrameworkElement) {
            if (this._headerElement)
                this._headerElement.MouseLeftButtonDown.off(this.OnHeaderMouseLeftButtonDown, this);
            this._headerElement = value;
            if (this._headerElement)
                this._headerElement.MouseLeftButtonDown.on(this.OnHeaderMouseLeftButtonDown, this);
        }

        private _expansionStateGroup: Media.VSM.VisualStateGroup;
        private get ExpansionStateGroup(): Media.VSM.VisualStateGroup { return this._expansionStateGroup; }
        private set ExpansionStateGroup(value: Media.VSM.VisualStateGroup) {
            if (this._expansionStateGroup)
                this._expansionStateGroup.CurrentStateChanged.off(this.OnExpansionStateGroupStateChanged, this);
            this._expansionStateGroup = value;
            if (this._expansionStateGroup)
                this._expansionStateGroup.CurrentStateChanged.on(this.OnExpansionStateGroupStateChanged, this);
        }

        private _parentItemsControl: ItemsControl;
        get ParentItemsControl(): ItemsControl { return this._parentItemsControl; }
        set ParentItemsControl(value: ItemsControl) {
            if (this._parentItemsControl == value)
                return;
            this._parentItemsControl = value;
            var parentTreeView = this.ParentTreeView;
            if (parentTreeView == null)
                return;
            if (this.RequiresContainsSelectionUpdate) {
                this.RequiresContainsSelectionUpdate = false;
                this.UpdateContainsSelection(true);
            }
            parentTreeView.CheckForSelectedDescendents(this);
        }

        private get ParentTreeViewItem(): TreeViewItem {
            var pic = <TreeViewItem>this.ParentItemsControl;
            if (pic instanceof TreeViewItem)
                return pic;
        }

        private get ParentTreeView(): TreeView {
            for (var tvi = this; tvi != null; tvi = tvi.ParentTreeViewItem) {
                var treeView = <TreeView>tvi.ParentItemsControl;
                if (treeView instanceof TreeView)
                    return treeView;
            }
            return null;
        }

        private get IsRoot(): boolean { return this.ParentItemsControl instanceof TreeView; }
        private get CanExpandOnInput(): boolean { return this.HasItems && this.IsEnabled; }

        private _MultiClick = new Internal.MultiClickHelper();
        private _IsPressed = false;

        constructor() {
            super();
            this.DefaultStyleKey = TreeViewItem;
        }

        OnApplyTemplate() {
            super.OnApplyTemplate();
            this.ExpanderButton = <Primitives.ToggleButton>this.GetTemplateChild("ExpanderButton", Primitives.ToggleButton);
            this.HeaderElement = <FrameworkElement>this.GetTemplateChild("Header", FrameworkElement);
            this.ExpansionStateGroup = Fayde.Media.VSM.VisualStateManager.GetGroup(this, "ExpansionStates");
            this.UpdateVisualState(false);
        }

        private OnExpansionStateGroupStateChanged(sender: any, e: Media.VSM.VisualStateChangedEventArgs) {
            if (e.NewState.Name && e.NewState.Name.toLowerCase() === "expanded")
                this.BringIntoView();
        }

        private BringIntoView() {
            if (!this.UserInitiatedExpansion)
                return;
            this.UserInitiatedExpansion = false;
            var parent = this.ParentTreeView;
            if (!parent)
                return;
            setTimeout(() => {
                parent.ItemsControlHelper.ScrollIntoView(this);
            }, 1);
        }

        GoToStates(gotoFunc: (state: string) => boolean) {
            super.GoToStates(gotoFunc);
            this.GoToStateExpansion(gotoFunc);
            this.GoToStateHasItems(gotoFunc);
            this.GoToStateSelection(gotoFunc);
        }
        GoToStateCommon(gotoFunc: (state: string) => boolean): boolean {
            if (!this.IsEnabled)
                return gotoFunc("Disabled");
            if (this._IsPressed)
                return gotoFunc("Pressed");
            if (this.IsMouseOver)
                return gotoFunc("MouseOver");
            return gotoFunc("Normal");
        }
        GoToStateExpansion(gotoFunc: (state: string) => boolean): boolean {
            return gotoFunc(this.IsExpanded ? "Expanded" : "Collapsed");
        }
        GoToStateHasItems(gotoFunc: (state: string) => boolean): boolean {
            return gotoFunc(this.HasItems ? "HasItems" : "NoItems");
        }
        GoToStateSelection(gotoFunc: (state: string) => boolean): boolean {
            if (!this.IsSelected)
                return gotoFunc("Unselected");
            if (!this.IsSelectionActive)
                return gotoFunc("SelectedInactive");
            return gotoFunc("Selected");
        }

        GetContainerForItem(): UIElement {
            return new TreeViewItem();
        }
        IsItemItsOwnContainer(item: any): boolean {
            return item instanceof TreeViewItem;
        }
        PrepareContainerForItem(element: UIElement, item: any) {
            var treeViewItem = <TreeViewItem>element;
            if (treeViewItem instanceof TreeViewItem)
                treeViewItem.ParentItemsControl = this;
            super.PrepareContainerForItem(element, item);
        }
        ClearContainerForItem(element: UIElement, item: any) {
            var treeViewItem = <TreeViewItem>element;
            if (treeViewItem instanceof TreeViewItem)
                treeViewItem.ParentItemsControl = null;
            super.ClearContainerForItem(element, item);
        }

        OnItemsChanged(e: Collections.CollectionChangedEventArgs) {
            super.OnItemsChanged(e);
            this.$SetHasItems(this.Items.Count > 0);
            if (e.NewItems != null) {
                for (var i = 0, items = <TreeViewItem[]>e.NewItems, len = items.length; i < len; i++) {
                    items[i].ParentItemsControl = this;
                }
            }
            switch (e.Action) {
                case Collections.CollectionChangedAction.Remove:
                case Collections.CollectionChangedAction.Reset:
                    if (this.ContainsSelection) {
                        var parentTreeView = this.ParentTreeView;
                        if (parentTreeView != null && !parentTreeView.IsSelectedContainerHookedUp) {
                            this.ContainsSelection = false;
                            this.Select(true);
                        }
                    }
                    break;
                case Collections.CollectionChangedAction.Replace:
                    if (this.ContainsSelection) {
                        var parentTreeView = this.ParentTreeView;
                        if (parentTreeView != null) {
                            var selectedItem = parentTreeView.SelectedItem;
                            if (selectedItem != null && (e.OldItems == null || nullstone.equals(selectedItem, e.OldItems[0])))
                                parentTreeView.ChangeSelection(selectedItem, parentTreeView.SelectedContainer, false);
                        }
                    }
                    break;
            }
            if (e.OldItems == null)
                return;
            for (var i = 0, items = <TreeViewItem[]>e.OldItems, len = items.length; i < len; i++) {
                items[i].ParentItemsControl = null;
            }
        }

        OnExpanded(e: RoutedEventArgs) {
            this.ToggleExpanded();
            this.Expanded.raise(this, e);
        }
        OnCollapsed(e: RoutedEventArgs) {
            this.ToggleExpanded();
            this.Collapsed.raise(this, e);
        }
        private ToggleExpanded() {
            var expanderButton = this.ExpanderButton;
            if (!expanderButton)
                return;
            expanderButton.IsChecked = this.IsExpanded;
            this.UpdateVisualState();
        }

        OnSelected(e: RoutedEventArgs) {
            this.UpdateVisualState();
            this.Selected.raise(this, e);
        }
        OnUnselected(e: RoutedEventArgs) {
            this.UpdateVisualState();
            this.Unselected.raise(this, e);
        }

        OnGotFocus(e: RoutedEventArgs) {
            super.OnGotFocus(e);
            var parentTreeViewItem = this.ParentTreeViewItem;
            if (parentTreeViewItem)
                parentTreeViewItem.CancelGotFocusBubble = true;
            try {
                if (!this.IsEnabled || this.CancelGotFocusBubble)
                    return;
                this.Select(true);
                this.$SetIsSelectionActive(true);
                this.UpdateVisualState();
            } finally {
                this.CancelGotFocusBubble = false;
            }
        }
        OnLostFocus(e: RoutedEventArgs) {
            super.OnLostFocus(e);
            this.$SetIsSelectionActive(false);
            this.UpdateVisualState();
        }
        private OnExpanderGotFocus(sender: any, e: RoutedEventArgs) {
            this.CancelGotFocusBubble = true;
            this.$SetIsSelectionActive(true);
            this.UpdateVisualState(true);
        }
        OnMouseEnter(e: Input.MouseEventArgs) {
            super.OnMouseEnter(e);
            this.UpdateVisualState();
        }
        OnMouseLeave(e: Input.MouseEventArgs) {
            super.OnMouseLeave(e);
            this.UpdateVisualState();
        }
        private OnHeaderMouseLeftButtonDown(sender: any, e: Input.MouseButtonEventArgs) {
            this._MultiClick.OnMouseLeftButtonDown(this, e);
            if (!e.Handled && this.IsEnabled) {
                if (this.Focus())
                    e.Handled = true;
                if (this._MultiClick.ClickCount % 2 === 0) {
                    var isExpanded = this.IsExpanded;
                    this.UserInitiatedExpansion = this.UserInitiatedExpansion || !isExpanded;
                    this.IsExpanded = !isExpanded;
                    e.Handled = true;
                }
            }
            this.OnMouseLeftButtonDown(e);
            this.UpdateVisualState();
        }
        private OnExpanderClick(sender: any, e: RoutedEventArgs) {
            var isExpanded = this.IsExpanded;
            this.UserInitiatedExpansion = this.UserInitiatedExpansion || !isExpanded;
            this.IsExpanded = !isExpanded;
        }
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs) {
            super.OnMouseLeftButtonDown(e);
            var parentTreeView: TreeView;
            if (!e.Handled && (parentTreeView = this.ParentTreeView) != null && parentTreeView.HandleMouseButtonDown())
                e.Handled = true;
            this._IsPressed = true;
            this.UpdateVisualState();
        }
        OnMouseLeftButtonUp(e: Input.MouseButtonEventArgs) {
            super.OnMouseLeftButtonUp(e);
            this._IsPressed = false;
            this.UpdateVisualState();
        }

        OnIsEnabledChanged(e: IDependencyPropertyChangedEventArgs) {
            super.OnIsEnabledChanged(e);
            if (!e.NewValue)
                this._IsPressed = false;
        }

        OnKeyDown(e: Input.KeyEventArgs) {
            super.OnKeyDown(e);
            if (this.IsEnabled) {
                if (e.Handled)
                    return;
                var isRTL = this.FlowDirection === FlowDirection.RightToLeft;
                switch (e.Key) {
                    case Input.Key.Left:
                        if (!Input.Keyboard.HasControl() && (isRTL ? this.HandleRightKey() : this.HandleLeftKey()))
                            e.Handled = true;
                        break;
                    case Input.Key.Up:
                        if (!Input.Keyboard.HasControl() && this.HandleUpKey())
                            e.Handled = true;
                        break;
                    case Input.Key.Right:
                        if (!Input.Keyboard.HasControl() && (isRTL ? this.HandleLeftKey() : this.HandleRightKey()))
                            e.Handled = true;
                        break;
                    case Input.Key.Down:
                        if (!Input.Keyboard.HasControl() && this.HandleDownKey())
                            e.Handled = true;
                        break;
                    case Input.Key.Add:
                        if (this.CanExpandOnInput && !this.IsExpanded) {
                            this.UserInitiatedExpansion = true;
                            this.IsExpanded = true;
                            e.Handled = true;
                        }
                        break;
                    case Input.Key.Subtract:
                        if (this.CanExpandOnInput && this.IsExpanded) {
                            this.IsExpanded = false;
                            e.Handled = true;
                        }
                        break;
                }
            }
            if (!this.IsRoot)
                return;
            var parentTreeView = this.ParentTreeView;
            if (!parentTreeView)
                return;
            parentTreeView.PropagateKeyDown(e);
        }
        HandleRightKey(): boolean {
            if (!this.CanExpandOnInput)
                return false;
            if (!this.IsExpanded) {
                this.UserInitiatedExpansion = true;
                this.IsExpanded = true;
                return true;
            }
            return this.HandleDownKey();
        }
        HandleLeftKey(): boolean {
            if (!this.CanExpandOnInput || !this.IsExpanded)
                return false;
            if (this.IsFocused)
                this.Focus();
            else
                this.IsExpanded = false;
            return true;
        }
        HandleDownKey(): boolean {
            return this.AllowKeyHandleEvent() && this.FocusDown();
        }
        HandleUpKey(): boolean {
            if (!this.AllowKeyHandleEvent())
                return false;
            var previousFocusableItem = this.FindPreviousFocusableItem();
            if (!previousFocusableItem)
                return false;
            if (previousFocusableItem != this.ParentItemsControl || previousFocusableItem != this.ParentTreeView)
                return previousFocusableItem.Focus();
            return true;
        }

        HandleScrollByPage(up: boolean, scrollHost: ScrollViewer, viewportHeight: number, top: number, bottom: number, currentDelta: IOutValue): boolean {
            var closeEdge1: IOutValue = { Value: 0.0 };
            currentDelta.Value = calculateDelta(up, this, scrollHost, top, bottom, closeEdge1);
            if (NumberEx.IsGreaterThanClose(closeEdge1.Value, viewportHeight) || NumberEx.IsLessThanClose(currentDelta.Value, viewportHeight))
                return false;
            var flag1 = false;
            var headerElement = this.HeaderElement;
            if (headerElement != null && NumberEx.IsLessThanClose(calculateDelta(up, headerElement, scrollHost, top, bottom, { Value: 0 }), viewportHeight))
                flag1 = true;
            var tvi1: TreeViewItem = null;
            var count = this.Items.Count;
            var flag2 = up && this.ContainsSelection;
            var index = up ? count - 1 : 0;
            while (0 <= index && index < count) {
                var tvi2 = <TreeViewItem>this.ItemContainersManager.ContainerFromIndex(index);
                if (tvi2 instanceof TreeViewItem && tvi2.IsEnabled) {
                    if (flag2) {
                        if (tvi2.IsSelected) {
                            flag2 = false;
                            index += up ? -1 : 1;
                            continue;
                        } else if (tvi2.ContainsSelection) {
                            flag2 = false;
                        } else {
                            index += up ? -1 : 1;
                            continue;
                        }
                    }
                    var currentDelta1: IOutValue = { Value: 0 };
                    if (tvi2.HandleScrollByPage(up, scrollHost, viewportHeight, top, bottom, currentDelta1))
                        return true;
                    if (!NumberEx.IsGreaterThanClose(currentDelta1.Value, viewportHeight))
                        tvi1 = tvi2;
                    else
                        break;
                }
                index += up ? -1 : 1;
            }
            if (tvi1 != null) {
                if (up)
                    return tvi1.Focus();
                return tvi1.FocusInto();
            } else if (flag1)
                return this.Focus();
            return false;
        }


        private Select(selected: boolean) {
            var parentTreeView = this.ParentTreeView;
            if (!parentTreeView || parentTreeView.IsSelectionChangeActive)
                return;
            var parentTreeViewItem = this.ParentTreeViewItem;
            var itemOrContainer = parentTreeViewItem != null ? parentTreeViewItem.ItemContainersManager.ItemFromContainer(this) : parentTreeView.ItemContainersManager.ItemFromContainer(this);
            parentTreeView.ChangeSelection(itemOrContainer, this, selected);
        }

        UpdateContainsSelection(selected: boolean) {
            for (var parentTreeViewItem = this.ParentTreeViewItem; parentTreeViewItem != null; parentTreeViewItem = parentTreeViewItem.ParentTreeViewItem)
                parentTreeViewItem.ContainsSelection = selected;
        }

        private AllowKeyHandleEvent(): boolean {
            return this.IsSelected;
        }

        FocusDown(): boolean {
            var nextFocusableItem = this.FindNextFocusableItem(true);
            return nextFocusableItem && nextFocusableItem.Focus();
        }
        FocusInto(): boolean {
            var lastFocusableItem = this.FindLastFocusableItem();
            return lastFocusableItem && lastFocusableItem.Focus();
        }

        private FindNextFocusableItem(recurse: boolean): TreeViewItem {
            if (recurse && this.IsExpanded && this.HasItems) {
                var treeViewItem = <TreeViewItem>this.ItemContainersManager.ContainerFromIndex(0);
                if (treeViewItem instanceof TreeViewItem) {
                    if (!treeViewItem.IsEnabled)
                        return treeViewItem.FindNextFocusableItem(false);
                    return treeViewItem;
                }
            }
            var parentItemsControl = this.ParentItemsControl;
            if (parentItemsControl != null) {
                var index = parentItemsControl.ItemContainersManager.IndexFromContainer(this);
                var count = parentItemsControl.Items.Count;
                while (index++ < count) {
                    var treeViewItem = <TreeViewItem>parentItemsControl.ItemContainersManager.ContainerFromIndex(index);
                    if (treeViewItem instanceof TreeViewItem && treeViewItem.IsEnabled)
                        return treeViewItem;
                }
                var parentTreeViewItem = this.ParentTreeViewItem;
                if (parentTreeViewItem instanceof TreeViewItem)
                    return parentTreeViewItem.FindNextFocusableItem(false);
            }
            return null;
        }
        private FindLastFocusableItem(): TreeViewItem {
            var tvi1 = this;
            var tvi2: TreeViewItem = null;
            for (var index = -1; tvi1 instanceof TreeViewItem; tvi1 = <TreeViewItem>tvi2.ItemContainersManager.ContainerFromIndex(index)) {
                if (tvi1.IsEnabled) {
                    if (!tvi1.IsExpanded || !tvi1.HasItems)
                        return tvi1;
                    tvi2 = tvi1;
                    index = tvi1.Items.Count - 1;
                }
                else if (index > 0)
                    --index;
                else
                    break;
            }
            return tvi2;
        }
        private FindPreviousFocusableItem(): ItemsControl {
            var parentItemsControl = this.ParentItemsControl;
            if (!parentItemsControl)
                return null;
            var index = parentItemsControl.ItemContainersManager.IndexFromContainer(this);
            while (index-- > 0) {
                var treeViewItem = <TreeViewItem>parentItemsControl.ItemContainersManager.ContainerFromIndex(index);
                if (treeViewItem instanceof TreeViewItem && treeViewItem.IsEnabled) {
                    var lastFocusableItem = treeViewItem.FindLastFocusableItem();
                    if (lastFocusableItem != null)
                        return lastFocusableItem;
                }
            }
            return parentItemsControl;
        }
    }
    TemplateVisualStates(TreeViewItem,
        { GroupName: "CommonStates", Name: "Normal" },
        { GroupName: "CommonStates", Name: "MouseOver" },
        { GroupName: "CommonStates", Name: "Pressed" },
        { GroupName: "CommonStates", Name: "Disabled" },
        { GroupName: "FocusStates", Name: "Unfocused" },
        { GroupName: "FocusStates", Name: "Focused" },
        { GroupName: "ExpansionStates", Name: "Collapsed" },
        { GroupName: "ExpansionStates", Name: "Expanded" },
        { GroupName: "HasItemsStates", Name: "HasItems" },
        { GroupName: "HasItemsStates", Name: "NoItems" },
        { GroupName: "SelectionStates", Name: "Unselected" },
        { GroupName: "SelectionStates", Name: "Selected" },
        { GroupName: "SelectionStates", Name: "SelectedInactive" });
    TemplateParts(TreeViewItem,
        { Name: "Header", Type: FrameworkElement },
        { Name: "ExpanderButton", Type: Primitives.ToggleButton });

    function calculateDelta(up: boolean, element: FrameworkElement, scrollHost: ScrollViewer, top: number, bottom: number, closeEdge: IOutValue): number {
        var top1: IOutValue = { Value: 0 };
        var bottom1: IOutValue = { Value: 0 };
        ScrollExtensions.GetTopAndBottom(element, scrollHost, top1, bottom1);
        var ce = 0;
        if (up) {
            ce = bottom - bottom1.Value;
            return bottom - top1.Value;
        } else {
            ce = top1.Value - top;
            return bottom1.Value - top;
        }
        closeEdge.Value = ce;
    }
}