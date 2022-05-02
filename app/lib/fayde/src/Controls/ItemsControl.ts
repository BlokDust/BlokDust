/// <reference path="Control.ts" />

module Fayde.Controls {
    export class ItemsControlNode extends ControlNode {
        XObject: ItemsControl;
        constructor(xobj: ItemsControl) {
            super(xobj);
        }

        ItemsPresenter: ItemsPresenter = null;
        GetDefaultVisualTree(): UIElement {
            var presenter = this.ItemsPresenter;
            if (!presenter)
                (presenter = new ItemsPresenter()).TemplateOwner = this.XObject;
            return presenter;
        }
    }

    export class ItemsControl extends Control {
        XamlNode: ItemsControlNode;
        CreateNode(): ItemsControlNode { return new ItemsControlNode(this); }

        get IsItemsControl(): boolean { return true; }

        static DisplayMemberPathProperty = DependencyProperty.Register("DisplayMemberPath", () => String, ItemsControl, null, (d, args) => (<ItemsControl>d).OnDisplayMemberPathChanged(args));
        static ItemsPanelProperty = DependencyProperty.Register("ItemsPanel", () => ItemsPanelTemplate, ItemsControl);
        static ItemsSourceProperty = DependencyProperty.RegisterFull("ItemsSource", () => nullstone.IEnumerable_, ItemsControl, null, (d, args) => (<ItemsControl>d).OnItemsSourceChanged(args));
        static ItemsProperty = DependencyProperty.RegisterImmutable<ItemCollection>("Items", () => ItemCollection, ItemsControl);
        static ItemTemplateProperty = DependencyProperty.Register("ItemTemplate", () => DataTemplate, ItemsControl, undefined, (d, args) => (<ItemsControl>d).OnItemTemplateChanged(args));

        static IsItemsHostProperty = DependencyProperty.RegisterAttached("IsItemsHost", () => Boolean, ItemsControl, false);
        static GetIsItemsHost(d: DependencyObject): boolean { return d.GetValue(ItemsControl.IsItemsHostProperty) === true; }
        static SetIsItemsHost(d: DependencyObject, value: boolean) { d.SetValue(ItemsControl.IsItemsHostProperty, value === true); }

        DisplayMemberPath: string;
        ItemsPanel: ItemsPanelTemplate;
        ItemsSource: nullstone.IEnumerable<any>;
        Items: ItemCollection;
        ItemTemplate: DataTemplate;

        OnDisplayMemberPathChanged(e: IDependencyPropertyChangedEventArgs) {
            for (var en = this.ItemContainersManager.GetEnumerator(); en.moveNext();) {
                this.UpdateContainerTemplate(en.current, en.CurrentItem);
            }
        }
        OnItemsSourceChanged(e: IDependencyPropertyChangedEventArgs) {
            //Unsubscribe from old
            var nc = Collections.INotifyCollectionChanged_.as(e.OldValue);
            if (nc)
                nc.CollectionChanged.off(this._OnItemsSourceUpdated, this);
            var items = this.Items;
            var resetargs = Collections.CollectionChangedEventArgs.Reset(items.ToArray());

            //Reset old
            try {
                this._SuspendItemsChanged = true;
                items.Clear();
            } finally {
                this._SuspendItemsChanged = false;
            }
            this.OnItemsChanged(resetargs);

            //Notify new
            this._IsDataBound = !!e.NewValue;
            var arr = toArray(e.NewValue);
            try {
                this._SuspendItemsChanged = true;
                if (arr)
                    items.AddRange(arr);
            } finally {
                this._SuspendItemsChanged = false;
            }
            if (arr)
                this.OnItemsChanged(Collections.CollectionChangedEventArgs.AddRange(arr, 0));

            //Subscribe to new
            var nc = Collections.INotifyCollectionChanged_.as(e.NewValue);
            if (nc)
                nc.CollectionChanged.on(this._OnItemsSourceUpdated, this);
        }

        OnItemTemplateChanged (e: IDependencyPropertyChangedEventArgs) {
            for (var en = this.ItemContainersManager.GetEnumerator(); en.moveNext();) {
                this.UpdateContainerTemplate(en.current, en.CurrentItem);
            }
        }

        private _ItemContainersManager: Internal.IItemContainersManager;
        get ItemContainersManager(): Internal.IItemContainersManager { return this._ItemContainersManager; }

        constructor() {
            super();
            this.DefaultStyleKey = ItemsControl;
            var coll = <ItemCollection>ItemsControl.ItemsProperty.Initialize(this);
            coll.ItemsChanged.on(this._OnItemsUpdated, this);

            this._ItemContainersManager = new Internal.ItemContainersManager(this);
        }

        PrepareContainerForItem(container: UIElement, item: any) {
            if (this.DisplayMemberPath != null && this.ItemTemplate != null)
                throw new InvalidOperationException("Cannot set 'DisplayMemberPath' and 'ItemTemplate' simultaneously");
            this.UpdateContainerTemplate(container, item);
        }
        ClearContainerForItem(container: UIElement, item: any) {
            if (container instanceof ContentPresenter) {
                var cp = <ContentPresenter>container;
                if (cp.Content === item)
                    cp.Content = null;
            } else if (container instanceof ContentControl) {
                var cc = <ContentControl>container;
                if (cc.Content === item)
                    cc.Content = null;
            }
        }
        GetContainerForItem(): UIElement { return new ContentPresenter(); }
        IsItemItsOwnContainer(item: any): boolean { return item instanceof UIElement; }

        private _IsDataBound = false;
        private _SuspendItemsChanged = false;
        private _OnItemsUpdated(sender: any, e: Collections.CollectionChangedEventArgs) {
            if (this._SuspendItemsChanged) //Ignore OnItemsSourceChanged operations
                return;
            if (this._IsDataBound)
                throw new InvalidOperationException("Cannot modify Items while bound to ItemsSource.");
            this.OnItemsChanged(e);
        }
        private _OnItemsSourceUpdated(sender: any, e: Collections.CollectionChangedEventArgs) {
            var items = this.Items;
            try {
                this._SuspendItemsChanged = true;
                switch (e.Action) {
                    case Collections.CollectionChangedAction.Add:
                        for (var i = 0, len = e.NewItems.length; i < len; i++) {
                            items.Insert(e.NewStartingIndex + i, e.NewItems[i]);
                        }
                        break;
                    case Collections.CollectionChangedAction.Remove:
                        for (var i = 0, len = e.OldItems.length; i < len; i++) {
                            items.RemoveAt(e.OldStartingIndex);
                        }
                        break;
                    case Collections.CollectionChangedAction.Replace:
                        items.SetValueAt(e.NewStartingIndex, e.NewItems[0]);
                        break;
                    case Collections.CollectionChangedAction.Reset:
                        items.Clear();
                        break;
                }
            } finally {
                this._SuspendItemsChanged = false;
            }
            this.OnItemsChanged(e);
        }
        OnItemsChanged(e: Collections.CollectionChangedEventArgs) {
            switch (e.Action) {
                case Collections.CollectionChangedAction.Add:
                    this.OnItemsAdded(e.NewStartingIndex, e.NewItems);
                    break;
                case Collections.CollectionChangedAction.Remove:
                    this.OnItemsRemoved(e.OldStartingIndex, e.OldItems);
                    break;
                case Collections.CollectionChangedAction.Replace:
                    this.OnItemsRemoved(e.NewStartingIndex, e.OldItems);
                    this.OnItemsAdded(e.NewStartingIndex, e.NewItems);
                    break;
                case Collections.CollectionChangedAction.Reset:
                    this.OnItemsRemoved(0, e.OldItems);
                    break;
            }
        }
        OnItemsAdded(index: number, newItems: any[]) {
            this._ItemContainersManager.OnItemsAdded(index, newItems);
            var presenter = this.XamlNode.ItemsPresenter;
            if (presenter)
                presenter.OnItemsAdded(index, newItems);
        }
        OnItemsRemoved(index: number, oldItems: any[]) {
            var presenter = this.XamlNode.ItemsPresenter;
            if (presenter)
                presenter.OnItemsRemoved(index, oldItems);
            this._ItemContainersManager.OnItemsRemoved(index, oldItems);
        }

        private UpdateContainerTemplate(container: UIElement, item: any) {
            if (!container || container === item)
                return;

            var template: DataTemplate;
            if (!(item instanceof UIElement))
                template = this.ItemTemplate || this._GetDisplayMemberTemplate();

            if (container instanceof ContentPresenter) {
                var cp = <ContentPresenter>container;
                cp.ContentTemplate = template;
                cp.Content = item;
            } else if (container instanceof ContentControl) {
                var cc = <ContentControl>container;
                cc.ContentTemplate = template;
                cc.Content = item;
            }
        }
        private _DisplayMemberTemplate: DataTemplate = null;
        private _GetDisplayMemberTemplate(): DataTemplate {
            if (!this._DisplayMemberTemplate) {
                var xm = DisplayTemplate.create(this.DisplayMemberPath || "");
                this._DisplayMemberTemplate = Markup.Load<DataTemplate>(this.App, xm);
            }
            return this._DisplayMemberTemplate;
        }
    }
    Fayde.CoreLibrary.add(ItemsControl);
    Markup.Content(ItemsControl, ItemsControl.ItemsProperty);

    function toArray(value: any): any[] {
        if (value instanceof Array)
            return <any[]>value;
        var enu = nullstone.IEnumerable_.as(value);
        if (enu) {
            var arr = [];
            for (var en = enu.getEnumerator(); en.moveNext();) {
                arr.push(en.current);
            }
            return arr;
        }
        return null;
    }

    module DisplayTemplate {
        export function create (dmp: string) {
            return Fayde.Markup.CreateXaml("<DataTemplate xmlns=\"" + Fayde.XMLNS + "\"><Grid><TextBlock Text=\"{Binding " + dmp + "}\" /></Grid></DataTemplate>"
                , Fayde.XMLNS + "/itemscontrol/displaymember/" + dmp);
        }
    }
}