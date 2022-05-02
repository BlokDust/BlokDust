module Fayde.Controls {
    var ElementTemplateTopName = "TemplateTop";
    var ElementTemplateBottomName = "TemplateBottom";
    var ElementTemplateLeftName = "TemplateLeft";
    var ElementTemplateRightName = "TemplateRight";
    var ElementTabPanelTopName = "TabPanelTop";
    var ElementTabPanelBottomName = "TabPanelBottom";
    var ElementTabPanelLeftName = "TabPanelLeft";
    var ElementTabPanelRightName = "TabPanelRight";
    var ElementContentTopName = "ContentTop";
    var ElementContentBottomName = "ContentBottom";
    var ElementContentLeftName = "ContentLeft";
    var ElementContentRightName = "ContentRight";

    export class TabControl extends ItemsControl {
        static SelectedItemProperty = DependencyProperty.Register("SelectedItem", () => Object, TabControl, null, (d: TabControl, args) => d.OnSelectedItemChanged(args));
        static SelectedIndexProperty = DependencyProperty.Register("SelectedIndex", () => Number, TabControl, -1, (d: TabControl, args) => d.OnSelectedIndexChanged(args));
        static SelectedContentProperty = DependencyProperty.Register("SelectedContent", () => Object, TabControl, null, (d: TabControl, args) => d.OnSelectedContentChanged(args));
        static TabStripPlacementProperty = DependencyProperty.Register("TabStripPlacement", () => new Enum(Dock), TabControl, Dock.Top, (d: TabControl, args) => d.OnTabStripPlacementPropertyChanged(args));
        SelectedItem: any;
        SelectedIndex: number;
        SelectedContent: any;
        TabStripPlacement: Dock;
        SelectionChanged = new RoutedEvent<Controls.Primitives.SelectionChangedEventArgs>();

        private _ElementTemplateTop: FrameworkElement;
        private _ElementTemplateBottom: FrameworkElement;
        private _ElementTemplateLeft: FrameworkElement;
        private _ElementTemplateRight: FrameworkElement;

        private _ElementTabPanelTop: TabPanel;
        private _ElementTabPanelBottom: TabPanel;
        private _ElementTabPanelLeft: TabPanel;
        private _ElementTabPanelRight: TabPanel;

        private _ElementContentTop: ContentPresenter;
        private _ElementContentBottom: ContentPresenter;
        private _ElementContentLeft: ContentPresenter;
        private _ElementContentRight: ContentPresenter;

        private _UpdateIndex = true;
        private _DesiredIndex: number = 0;

        constructor () {
            super();
            this.DefaultStyleKey = TabControl;
        }

        OnApplyTemplate () {
            super.OnApplyTemplate();
            if (this._ElementTabPanelTop != null)
                this._ElementTabPanelTop.Children.Clear();
            if (this._ElementTabPanelBottom != null)
                this._ElementTabPanelBottom.Children.Clear();
            if (this._ElementTabPanelLeft != null)
                this._ElementTabPanelLeft.Children.Clear();
            if (this._ElementTabPanelRight != null)
                this._ElementTabPanelRight.Children.Clear();

            var contentHost = this._GetContentHost(this.TabStripPlacement);
            if (contentHost != null)
                contentHost.Content = null;
            this._ElementTemplateTop = <FrameworkElement>this.GetTemplateChild("TemplateTop", FrameworkElement);
            this._ElementTemplateBottom = <FrameworkElement>this.GetTemplateChild("TemplateBottom", FrameworkElement);
            this._ElementTemplateLeft = <FrameworkElement>this.GetTemplateChild("TemplateLeft", FrameworkElement);
            this._ElementTemplateRight = <FrameworkElement>this.GetTemplateChild("TemplateRight", FrameworkElement);
            this._ElementTabPanelTop = <TabPanel>this.GetTemplateChild("TabPanelTop", TabPanel);
            this._ElementTabPanelBottom = <TabPanel>this.GetTemplateChild("TabPanelBottom", TabPanel);
            this._ElementTabPanelLeft = <TabPanel>this.GetTemplateChild("TabPanelLeft", TabPanel);
            this._ElementTabPanelRight = <TabPanel>this.GetTemplateChild("TabPanelRight", TabPanel);
            TabPanel.setTabAlignment(this._ElementTabPanelTop, Dock.Top);
            TabPanel.setTabAlignment(this._ElementTabPanelBottom, Dock.Bottom);
            TabPanel.setTabAlignment(this._ElementTabPanelLeft, Dock.Left);
            TabPanel.setTabAlignment(this._ElementTabPanelRight, Dock.Right);
            this._ElementContentTop = <ContentPresenter>this.GetTemplateChild("ContentTop", ContentPresenter);
            this._ElementContentBottom = <ContentPresenter>this.GetTemplateChild("ContentBottom", ContentPresenter);
            this._ElementContentLeft = <ContentPresenter>this.GetTemplateChild("ContentLeft", ContentPresenter);
            this._ElementContentRight = <ContentPresenter>this.GetTemplateChild("ContentRight", ContentPresenter);

            var enumerator = this.Items.getEnumerator();
            while (enumerator.moveNext()) {
                var tabItem = <TabItem>enumerator.current;
                if (!(tabItem instanceof TabItem))
                    this._ThrowInvalidTabItem(tabItem);
                this._AddToTabPanel(tabItem);
            }

            if (this.SelectedIndex >= 0)
                this.UpdateSelectedContent(this.SelectedContent);
            this.UpdateTabPanelLayout(this.TabStripPlacement, this.TabStripPlacement);
            this.UpdateVisualState(false);
        }

        private OnSelectedItemChanged (args: IDependencyPropertyChangedEventArgs) {
            var oldItem = <TabItem>args.OldValue;
            var newItem = <TabItem>args.NewValue;
            var num = newItem == null ? -1 : this.Items.IndexOf(newItem);
            if (newItem != null && num === -1) {
                this.SelectedItem = oldItem;
            } else {
                this.SelectedIndex = num;
                this.SelectItem(oldItem, newItem);
            }
        }

        private OnSelectedIndexChanged (args: IDependencyPropertyChangedEventArgs) {
            var index = <number>args.NewValue;
            var num = <number>args.OldValue;
            if (index < -1)
                throw new ArgumentException("'" + index.toString() + "' is not a valid value for property 'SelectedIndex'");
            if (this._UpdateIndex)
                this._DesiredIndex = index;
            else if (!this._UpdateIndex)
                this._UpdateIndex = true;
            if (index >= this.Items.Count) {
                this._UpdateIndex = false;
                this.SelectedIndex = num;
            } else {
                var item: any;
                if (index >= 0 && index < this.Items.Count)
                    item = this.Items.GetValueAt(index);
                if (this.SelectedItem === item)
                    return;
                this.SelectedItem = item;
            }
        }

        private OnSelectedContentChanged (args: IDependencyPropertyChangedEventArgs) {
            this.UpdateSelectedContent(args.NewValue);
        }

        private OnTabStripPlacementPropertyChanged (args: IDependencyPropertyChangedEventArgs) {
            this.UpdateTabPanelLayout(<Dock> args.OldValue, <Dock> args.NewValue);
            var enumerator = this.Items.getEnumerator();
            var ti: TabItem;
            while (enumerator.moveNext()) {
                ti = <TabItem>enumerator.current;
                if (ti != null)
                    ti.UpdateVisualState();
            }
        }

        OnItemsChanged (e: Collections.CollectionChangedEventArgs) {
            super.OnItemsChanged(e);
            switch (e.Action) {
                case Collections.CollectionChangedAction.Add:
                    var index1 = -1;
                    var len = e.NewItems.length;
                    for (var i = 0; i < len; i++) {
                        var obj = e.NewItems[i];
                        var tabItem = <TabItem>obj;
                        if (!(tabItem instanceof TabItem))
                            this._ThrowInvalidTabItem(tabItem);
                        var index2 = this.Items.IndexOf(tabItem);
                        this._InsertIntoTabPanel(index2, tabItem);
                        if (tabItem.IsSelected)
                            index1 = index2;
                        else if (this.SelectedItem !== this._GetItemAtIndex(this.SelectedIndex))
                            index1 = this.Items.IndexOf(this.SelectedItem);
                        else if (this._DesiredIndex < this.Items.Count && this._DesiredIndex >= 0)
                            index1 = this._DesiredIndex;
                        tabItem.UpdateVisualState();
                    }
                    if (index1 === -1) {
                        var enumerator = this.Items.getEnumerator();
                        while (enumerator.moveNext()) {
                            var tabItem = <TabItem>enumerator.current;
                            if (!(tabItem instanceof TabItem))
                                this._ThrowInvalidTabItem(tabItem);
                            if (tabItem.IsSelected)
                                return;
                        }
                        if (this.Items.Count <= 1) {
                            var item0 = <TabItem>this.Items.GetValueAt(0);
                            var iss = item0.ReadLocalValue(TabItem.IsSelectedProperty);
                            if (iss !== false)
                                index1 = 0;
                        } else {
                            index1 = 0;
                        }
                    }
                    this.SelectedItem = this._GetItemAtIndex(index1);
                    this.SelectedIndex = index1;
                    break;
                case Collections.CollectionChangedAction.Remove:
                    var len = e.OldItems.length;
                    var tabItem: TabItem;
                    for (var i = 0; i < len; i++) {
                        tabItem = <TabItem>e.OldItems[i];
                        this._RemoveFromTabPanel(tabItem);
                        if (this.Items.Count === 0)
                            this.SelectedIndex = -1;
                        else if (this.Items.Count <= this.SelectedIndex)
                            this.SelectedIndex = this.Items.Count - 1;
                        else
                            this.SelectedItem = this._GetItemAtIndex(this.SelectedIndex);
                    }
                    break;
                case Collections.CollectionChangedAction.Reset:
                    this._ClearTabPanel();
                    this.SelectedIndex = -1;
                    var tabItem: TabItem;
                    var enumerator = this.Items.getEnumerator();
                    while (enumerator.moveNext()) {
                        tabItem = <TabItem>enumerator.current;
                        if (!(tabItem instanceof TabItem))
                            this._ThrowInvalidTabItem(tabItem);
                        this._AddToTabPanel(tabItem);
                        if (tabItem.IsSelected)
                            this.SelectedItem = tabItem;
                    }
                    if (this.SelectedIndex !== -1 || this.Items.Count <= 0)
                        break;
                    this.SelectedIndex = 0;
                    break;
            }
        }

        OnKeyDown (e: Input.KeyEventArgs) {
            super.OnKeyDown(e);
            if (e.Handled)
                return;
            var nextTabItem: TabItem;

            switch (e.Key) {
                case Input.Key.End:
                    nextTabItem = this._FindEndTabItem();
                    break;
                case Input.Key.Home:
                    nextTabItem = this._FindHomeTabItem();
                    break;
                default:
                    return;
            }
            if (nextTabItem == null || nextTabItem === this.SelectedItem)
                return;
            e.Handled = true;
            this.SelectedItem = nextTabItem;
            nextTabItem.Focus();
        }

        private _FindEndTabItem (): TabItem {
            var items = this.Items;
            var len = items.Count;
            var tabItem: TabItem = null;
            for (var i = len - 1; i >= 0; i--) {
                tabItem = <TabItem>items.GetValueAt(i);
                if (tabItem.IsEnabled && tabItem.Visibility === Visibility.Visible)
                    return tabItem;
            }
            return null;
        }

        private _FindHomeTabItem (): TabItem {
            var items = this.Items;
            var len = items.Count;
            var tabItem: TabItem = null;
            for (var i = 0; i < len; i++) {
                tabItem = <TabItem>items.GetValueAt(i);
                if (tabItem.IsEnabled && tabItem.Visibility === Visibility.Visible)
                    return tabItem;
            }
            return null;
        }

        private SelectItem (oldItem: TabItem, newItem: TabItem) {
            if (newItem == null) {
                var contentHost = this._GetContentHost(this.TabStripPlacement);
                if (contentHost != null)
                    contentHost.Content = null;
                this.SetValue(TabControl.SelectedContentProperty, null);
            }
            var tabItem: TabItem;
            var enumerator = this.Items.getEnumerator();
            while (enumerator.moveNext()) {
                var tabItem = <TabItem>enumerator.current;
                if (!(tabItem instanceof TabItem))
                    this._ThrowInvalidTabItem(tabItem);
                if (tabItem !== newItem && tabItem.IsSelected) {
                    tabItem.IsSelected = false;
                } else if (tabItem === newItem) {
                    tabItem.IsSelected = true;
                    this.SetValue(TabControl.SelectedContentProperty, tabItem.Content);
                }
            }

            var oldItems: TabItem[] = [];
            if (oldItem != null)
                oldItems.push(oldItem);

            var newItems: TabItem[] = [];
            if (newItem != null)
                newItems.push(newItem);
            var e = new Controls.Primitives.SelectionChangedEventArgs(oldItems, newItems)
            this.OnSelectionChanged(e);
            this.SelectionChanged.raise(this, e);
        }

        OnSelectionChanged (e: Controls.Primitives.SelectionChangedEventArgs) {
        }

        private UpdateTabPanelLayout (oldValue: Dock, newValue: Dock) {
            var template1 = this._GetTemplate(oldValue);
            var template2 = this._GetTemplate(newValue);
            var tabPanel1 = this._GetTabPanel(oldValue);
            var tabPanel2 = this._GetTabPanel(newValue);
            var contentHost1 = this._GetContentHost(oldValue);
            var contentHost2 = this._GetContentHost(newValue);
            if (oldValue !== newValue) {
                if (template1 != null)
                    template1.Visibility = Visibility.Collapsed;
                if (tabPanel1 != null)
                    tabPanel1.Children.Clear();
                if (tabPanel2 != null) {
                    var enumerator = this.Items.getEnumerator();
                    var ti: TabItem;
                    while (enumerator.moveNext()) {
                        ti = <TabItem>enumerator.current;
                        if (!(ti instanceof TabItem))
                            this._ThrowInvalidTabItem(ti);
                        this._AddToTabPanel(ti);
                    }
                }
                if (contentHost1 != null)
                    contentHost1.Content = null;
                if (contentHost2 != null)
                    contentHost2.Content = this.SelectedContent;
            }
            if (template2 == null)
                return;
            template2.Visibility = Visibility.Visible;
        }

        private UpdateSelectedContent (content: any) {
            var tabItem = <TabItem>this.SelectedItem;
            if (!(tabItem instanceof TabItem))
                return;
            var contentHost = this._GetContentHost(this.TabStripPlacement);
            if (contentHost == null)
                return;
            contentHost.HorizontalAlignment = tabItem.HorizontalContentAlignment;
            contentHost.VerticalAlignment = tabItem.VerticalContentAlignment;
            contentHost.ContentTemplate = tabItem.ContentTemplate;
            contentHost.Content = content;
        }

        private EnsureLanguageBinding (tabItem: TabItem) {
            if (tabItem == null)
                return;
            var frameworkElement = <FrameworkElement>tabItem.Content;
            if (!(frameworkElement instanceof FrameworkElement) || frameworkElement.ReadLocalValue(FrameworkElement.LanguageProperty) !== DependencyProperty.UnsetValue)
                return;
            var binding = new Fayde.Data.Binding("Language");
            binding.Source = this;
            frameworkElement.SetBinding(FrameworkElement.LanguageProperty, binding);
        }

        private ClearLanguageBinding (tabItem: TabItem) {
            if (tabItem == null)
                return;
            var frameworkElement = <FrameworkElement>tabItem.Content;
            if (!(frameworkElement instanceof FrameworkElement) || frameworkElement.ReadLocalValue(FrameworkElement.LanguageProperty) !== DependencyProperty.UnsetValue)
                return;
            frameworkElement.ClearValue(FrameworkElement.LanguageProperty);
        }

        private _AddToTabPanel (ti: TabItem) {
            var tabPanel = this._GetTabPanel(this.TabStripPlacement);
            if (!tabPanel || tabPanel.Children.Contains(ti))
                return;
            tabPanel.Children.Add(ti);
            this.EnsureLanguageBinding(ti);
        }

        private _InsertIntoTabPanel (index: number, ti: TabItem) {
            var tabPanel = this._GetTabPanel(this.TabStripPlacement);
            if (!tabPanel || tabPanel.Children.Contains(ti))
                return;
            tabPanel.Children.Insert(index, ti);
        }

        private _RemoveFromTabPanel (ti: TabItem) {
            var tabPanel = this._GetTabPanel(this.TabStripPlacement);
            if (!tabPanel || !tabPanel.Children.Contains(ti))
                return;
            tabPanel.Children.Remove(ti);
        }

        private _ClearTabPanel () {
            var tabPanel = this._GetTabPanel(this.TabStripPlacement);
            if (!tabPanel)
                return;
            var enumerator = tabPanel.Children.getEnumerator();
            while (enumerator.moveNext()) {
                var tabItem = <TabItem>enumerator.current;
                if (tabItem != null)
                    this.ClearLanguageBinding(tabItem);
            }
            tabPanel.Children.Clear();
        }

        private _GetTabPanel (tabPlacement: Dock): TabPanel {
            switch (tabPlacement) {
                case Dock.Left:
                    return this._ElementTabPanelLeft;
                case Dock.Top:
                    return this._ElementTabPanelTop;
                case Dock.Right:
                    return this._ElementTabPanelRight;
                case Dock.Bottom:
                    return this._ElementTabPanelBottom;
                default:
                    return null;
            }
        }

        private _GetTemplate (tabPlacement: Dock): FrameworkElement {
            switch (tabPlacement) {
                case Dock.Left:
                    return this._ElementTemplateLeft;
                case Dock.Top:
                    return this._ElementTemplateTop;
                case Dock.Right:
                    return this._ElementTemplateRight;
                case Dock.Bottom:
                    return this._ElementTemplateBottom;
                default:
                    return null;
            }
        }

        private _GetContentHost (tabPlacement: Dock): ContentPresenter {
            switch (tabPlacement) {
                case Dock.Left:
                    return this._ElementContentLeft;
                case Dock.Top:
                    return this._ElementContentTop;
                case Dock.Right:
                    return this._ElementContentRight;
                case Dock.Bottom:
                    return this._ElementContentBottom;
                default:
                    return null;
            }
        }

        private _GetItemAtIndex (index: number): TabItem {
            if (index < 0 || index >= this.Items.Count)
                return null;
            var item = <TabItem>this.Items.GetValueAt(index);
            if (item instanceof TabItem)
                return item;
        }

        private _ThrowInvalidTabItem (obj: any) {
            var type: string = "object";
            try {
                type = obj.constructor._TypeName;
            } catch (err) {
            }
            throw new ArgumentException("Unable to cast object of type '" + type + "' to type 'System.Windows.Controls.TabItem'.");
        }
    }
    TemplateVisualStates(TabControl,
        {GroupName: "CommonStates", Name: "Normal"},
        {GroupName: "CommonStates", Name: "Disabled"});
    TemplateParts(TabControl,
        {Name: "TemplateLeft", Type: FrameworkElement},
        {Name: "ContentLeft", Type: ContentPresenter},
        {Name: "TabPanelLeft", Type: TabPanel},
        {Name: "TemplateTop", Type: FrameworkElement},
        {Name: "ContentTop", Type: ContentPresenter},
        {Name: "TabPanelTop", Type: TabPanel},
        {Name: "TemplateRight", Type: FrameworkElement},
        {Name: "ContentRight", Type: ContentPresenter},
        {Name: "TabPanelRight", Type: TabPanel},
        {Name: "TemplateBottom", Type: FrameworkElement},
        {Name: "ContentBottom", Type: ContentPresenter},
        {Name: "TabPanelBottom", Type: TabPanel});
}