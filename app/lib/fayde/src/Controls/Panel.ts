/// <reference path="../Core/FrameworkElement.ts" />
/// <reference path="../Core/XamlObjectCollection.ts" />
/// <reference path="../Core/Providers/ImmutableStore.ts" />

module Fayde.Controls {
    class PanelChildrenCollection extends XamlObjectCollection<UIElement> {
        $$updaters: minerva.core.Updater[] = [];
        AddingToCollection(value: UIElement, error: BError): boolean {
            var panelNode = <PanelNode>this.XamlNode.ParentNode;
            if (!panelNode.AttachVisualChild(value, error))
                return false;
            return super.AddingToCollection(value, error);
        }
        RemovedFromCollection(value: UIElement, isValueSafe: boolean) {
            var panelNode = <PanelNode>this.XamlNode.ParentNode;
            panelNode.DetachVisualChild(value, null);
            super.RemovedFromCollection(value, isValueSafe);
        }
        _RaiseCleared (values: UIElement[]) {
            this.$$updaters.length = 0;
        }
        _RaiseItemAdded(value: UIElement, index: number) {
            this.$$updaters.splice(index, 0, value.XamlNode.LayoutUpdater);
        }
        _RaiseItemRemoved(value: UIElement, index: number) {
            this.$$updaters.splice(index, 1);
        }
        _RaiseItemReplaced(removed: UIElement, added: UIElement, index: number) {
            this.$$updaters.splice(index, 1, added.XamlNode.LayoutUpdater);
        }
    }

    export class PanelNode extends FENode {
        LayoutUpdater: minerva.controls.panel.PanelUpdater;
        XObject: Panel;
        constructor(xobj: Panel) {
            super(xobj);
        }
        AttachVisualChild(uie: UIElement, error: BError): boolean {
            this.OnVisualChildAttached(uie);
            uie.XamlNode.SetIsLoaded(this.IsLoaded);
            return true;
        }
        DetachVisualChild(uie: UIElement, error: BError): boolean {
            this.OnVisualChildDetached(uie);
            uie.XamlNode.SetIsLoaded(false);
            return true;
        }
    }

    export class Panel extends FrameworkElement {
        XamlNode: PanelNode;
        CreateNode(): PanelNode { return new PanelNode(this); }
        CreateLayoutUpdater() { return new minerva.controls.panel.PanelUpdater(); }

        static BackgroundProperty = DependencyProperty.Register("Background", () => Media.Brush, Panel);
        static ChildrenProperty = DependencyProperty.RegisterImmutable<XamlObjectCollection<UIElement>>("Children", () => PanelChildrenCollection, Panel);
        static ZIndexProperty = DependencyProperty.RegisterAttached("ZIndex", () => Number, Panel, 0);
        static GetZIndex(uie: UIElement): number { return uie.GetValue(Panel.ZIndexProperty); }
        static SetZIndex(uie: UIElement, value: number) { uie.SetValue(Panel.ZIndexProperty, value); }
        Background: Media.Brush;
        Children: XamlObjectCollection<UIElement>;

        constructor() {
            super();
            var coll = <PanelChildrenCollection>Panel.ChildrenProperty.Initialize(this);
            this.XamlNode.LayoutUpdater.setChildren(coll.$$updaters);
            var error = new BError();
            this.XamlNode.SetSubtreeNode(coll.XamlNode, error);
        }
    }
    Fayde.CoreLibrary.add(Panel);
    Markup.Content(Panel, Panel.ChildrenProperty);

    module reactions {
        UIReaction<minerva.IBrush>(Panel.BackgroundProperty, (upd, ov, nv) => {
            if (nv !== ov) //nv === ov when child properties update
                upd.updateBounds();
            upd.invalidate();
        });
        UIReactionAttached<number>(Panel.ZIndexProperty, minerva.controls.panel.reactTo.zIndex);
    }
}