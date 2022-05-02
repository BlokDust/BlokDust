module Fayde.Controls {
    export class TabItem extends ContentControl {
        static HasHeaderProperty = DependencyProperty.Register("HasHeader", () => Boolean, TabItem, false);
        static HeaderProperty = DependencyProperty.Register("Header", () => Object, TabItem, null, (d, args) => (<TabItem>d)._OnHeaderChanged(args));
        static HeaderTemplateProperty = DependencyProperty.Register("HeaderTemplate", () => DataTemplate, TabItem, undefined, (d, args) => (<TabItem>d).OnHeaderTemplateChanged(<DataTemplate>args.OldValue, <DataTemplate>args.NewValue));
        static IsFocusedProperty = DependencyProperty.Register("IsFocused", () => Boolean, TabItem, false);
        static IsSelectedProperty = DependencyProperty.Register("IsSelected", () => Boolean, TabItem, false, (d, args) => (<TabItem>d)._OnIsSelectedChanged(args));
        HasHeader: boolean;
        Header: any;
        HeaderTemplate: DataTemplate;
        IsFocused: boolean;
        IsSelected: boolean;

        private _SelectedElements = new Elements();
        private _UnselectedElements = new Elements();

        private _PreviousTemplate: FrameworkElement = null;
        private _PreviousHeader: ContentControl = null;

        get TabStripPlacement(): Dock {
            var tabControlParent = this.TabControlParent;
            if (tabControlParent != null)
                return tabControlParent.TabStripPlacement;
            return Dock.Top;
        }
        private get TabControlParent(): TabControl {
            return VisualTreeHelper.GetParentOfType<TabControl>(this, TabControl);
        }

        constructor() {
            super();
            this.DefaultStyleKey = TabItem;
        }

        OnApplyTemplate() {
            super.OnApplyTemplate();
            var contentControl = this._GetContentControl(this.IsSelected, this.TabStripPlacement);
            if (contentControl != null)
                contentControl.Content = null;

            this._SelectedElements.OnApplyTemplate(this, true);
            this._UnselectedElements.OnApplyTemplate(this, false);

            this._UpdateHeaderVisuals();
            this.UpdateVisualState(false);
        }

        private _OnHeaderChanged(args: IDependencyPropertyChangedEventArgs) {
            this.HasHeader = args.NewValue != null;
            this.OnHeaderChanged(args.OldValue, args.NewValue);
        }
        OnHeaderChanged(oldValue: any, newValue: any) {
            this._UpdateHeaderVisuals();
        }
        OnHeaderTemplateChanged(oldHeaderTemplate: DataTemplate, newHeaderTemplate: DataTemplate) {
            this._UpdateHeaderVisuals();
        }
        private _OnIsSelectedChanged(args: IDependencyPropertyChangedEventArgs) {
            var isSelected = <boolean>args.NewValue;
            var e1 = new RoutedEventArgs();
            if (isSelected)
                this.OnSelected(e1);
            else
                this.OnUnselected(e1);
            this.IsTabStop = isSelected;
            this.UpdateVisualState();
        }
        OnSelected(e: RoutedEventArgs) {
            var parent = this.TabControlParent;
            if (!parent)
                return;
            parent.SelectedItem = this;
        }
        OnUnselected(e: RoutedEventArgs) {
            var parent = this.TabControlParent;
            if (!parent || parent.SelectedItem != this)
                return;
            parent.SelectedIndex = -1;
        }

        UpdateVisualState(useTransitions?: boolean) {
            var template = this.GetTemplate(this.IsSelected, this.TabStripPlacement);
            if (this._PreviousTemplate != null && this._PreviousTemplate !== template)
                this._PreviousTemplate.Visibility = Visibility.Collapsed;
            this._PreviousTemplate = template;
            if (template != null)
                template.Visibility = Visibility.Visible;
            var contentControl = this._GetContentControl(this.IsSelected, this.TabStripPlacement);
            if (this._PreviousHeader && this._PreviousHeader !== contentControl)
                this._PreviousHeader.Content = null;
            this._PreviousHeader = contentControl;
            this._UpdateHeaderVisuals();

            super.UpdateVisualState(useTransitions);
        }
        private _UpdateHeaderVisuals() {
            var contentControl = this._GetContentControl(this.IsSelected, this.TabStripPlacement);
            if (!contentControl)
                return;
            contentControl.Content = this.Header;
            contentControl.ContentTemplate = this.HeaderTemplate;
        }

        OnMouseLeave(e: Input.MouseEventArgs) {
            this.UpdateVisualState();
        }
        OnMouseEnter(e: Input.MouseEventArgs) {
            this.UpdateVisualState();
        }
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs) {
            if (!this.IsEnabled || !this.TabControlParent || (this.IsSelected || e.Handled))
                return;
            this.IsTabStop = true;
            e.Handled = this.Focus();
            this.TabControlParent.SelectedIndex = this.TabControlParent.Items.IndexOf(this);
        }

        OnGotFocus(e: RoutedEventArgs) {
            super.OnGotFocus(e);
            this.SetValueInternal(TabItem.IsFocusedProperty, true);
            this.UpdateVisualState();
        }
        OnLostFocus(e: RoutedEventArgs) {
            super.OnLostFocus(e);
            this.SetValueInternal(TabItem.IsFocusedProperty, false);
            this.UpdateVisualState();
        }

        OnContentChanged(oldContent: any, newContent: any) {
            super.OnContentChanged(oldContent, newContent);
            var parent = this.TabControlParent;
            if (!parent || !this.IsSelected)
                return;
            parent.SelectedContent = newContent;
        }

        OnKeyDown(e: Input.KeyEventArgs) {
            super.OnKeyDown(e);
            if (e.Handled)
                return;
            var parent = this.TabControlParent;
            var logicalKey = Input.InteractionHelper.GetLogicalKey(this.FlowDirection, e.Key);
            var startIndex = parent.Items.IndexOf(this);
            var nextTabItem: TabItem = null;
            switch (logicalKey) {
                case Input.Key.Left:
                case Input.Key.Up:
                    nextTabItem = this._FindPreviousTabItem(startIndex);
                    break;
                case Input.Key.Right:
                case Input.Key.Down:
                    nextTabItem = this._FindNextTabItem(startIndex);
                    break;
                default:
                    return;
            }
            if (!nextTabItem || nextTabItem === parent.SelectedItem)
                return;
            e.Handled = true;
            parent.SelectedItem = nextTabItem;
            nextTabItem.Focus();
        }

        GetTemplate(isSelected: boolean, tabPlacement: Dock): FrameworkElement {
            var e = isSelected ? this._SelectedElements : this._UnselectedElements;
            return (<Element>e[Dock[tabPlacement]]).Template;
        }
        private _GetContentControl(isSelected: boolean, tabPlacement: Dock): ContentControl {
            var e = isSelected ? this._SelectedElements : this._UnselectedElements;
            return (<Element>e[Dock[tabPlacement]]).Header;
        }

        private _FindPreviousTabItem(startIndex: number): TabItem {
            for (var i = startIndex, items = this.TabControlParent.Items; i >= 0; i--) {
                var tabItem = <TabItem>items.GetValueAt(i);
                if (tabItem.IsEnabled && tabItem.Visibility === Visibility.Visible)
                    return tabItem;
            }
            return null;
        }
        private _FindNextTabItem(startIndex: number): TabItem {
            for (var i = startIndex, items = this.TabControlParent.Items, len = items.Count; i < len; i++) {
                var tabItem = <TabItem>items.GetValueAt(i);
                if (tabItem.IsEnabled && tabItem.Visibility === Visibility.Visible)
                    return tabItem;
            }
            return null;
        }
    }
    TemplateVisualStates(TabItem,
        { GroupName: "CommonStates", Name: "Normal" },
        { GroupName: "CommonStates", Name: "MouseOver" },
        { GroupName: "CommonStates", Name: "Disabled" },
        { GroupName: "FocusStates", Name: "Unfocused" },
        { GroupName: "FocusStates", Name: "Focused" },
        { GroupName: "SelectionStates", Name: "Unselected" },
        { GroupName: "SelectionStates", Name: "Selected" });
    TemplateParts(TabItem,
        { Name: "HeaderLeftSelected", Type: FrameworkElement },
        { Name: "HeaderTopSelected", Type: FrameworkElement },
        { Name: "HeaderRightSelected", Type: FrameworkElement },
        { Name: "HeaderBottomSelected", Type: FrameworkElement },
        { Name: "TemplateLeftSelected", Type: FrameworkElement },
        { Name: "TemplateTopSelected", Type: FrameworkElement },
        { Name: "TemplateRightSelected", Type: FrameworkElement },
        { Name: "TemplateBottomSelected", Type: FrameworkElement },
        { Name: "HeaderLeftUnselected", Type: FrameworkElement },
        { Name: "HeaderTopUnselected", Type: FrameworkElement },
        { Name: "HeaderRightUnselected", Type: FrameworkElement },
        { Name: "HeaderBottomUnselected", Type: FrameworkElement },
        { Name: "TemplateLeftUnselected", Type: FrameworkElement },
        { Name: "TemplateTopUnselected", Type: FrameworkElement },
        { Name: "TemplateRightUnselected", Type: FrameworkElement },
        { Name: "TemplateBottomUnselected", Type: FrameworkElement });

    class Elements {
        Top = new Element();
        Bottom = new Element();
        Left = new Element();
        Right = new Element();
        OnApplyTemplate(control: Control, isSelected: boolean) {
            this.Top.OnApplyTemplate(control, isSelected, "Top");
            this.Bottom.OnApplyTemplate(control, isSelected, "Bottom");
            this.Left.OnApplyTemplate(control, isSelected, "Left");
            this.Right.OnApplyTemplate(control, isSelected, "Right");
        }
    }
    class Element {
        Header: ContentControl = null;
        Template: FrameworkElement = null;
        OnApplyTemplate(control: Control, isSelected: boolean, dock: string) {
            var post = dock + (isSelected ? "Selected" : "Unselected");
            this.Header = <ContentControl>control.GetTemplateChild("Header" + post, ContentControl);
            this.Template = <FrameworkElement>control.GetTemplateChild("Template" + post, FrameworkElement);
        }
    }
}