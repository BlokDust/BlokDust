
module Fayde.Engine {
    interface IFocusChangedEvents {
        GotFocus: Fayde.UINode[];
        LostFocus: Fayde.UINode[];
    }

    export class FocusManager {
        private _State: IInputState;
        private _ChangedEvents: IFocusChangedEvents[] = [];
        Node: UINode;

        constructor(state: IInputState) {
            this._State = state;
        }
        
        GetFocusToRoot():UINode[] {
            if (!this.Node)
                return null;
            return elementPathToRoot(this.Node);
        }

        OnNodeDetached(node: UINode) {
            var f = this.Node;
            while (f) {
                if (f === node) {
                    this._FocusNode();
                    return;
                }
                f = f.VisualParentNode;
            }
        }

        TabFocus(isShift: boolean) {
            if (!this.Node)
                return false;
            Fayde.TabNavigationWalker.Focus(this.Node, !isShift);
            return true;
        }
        Focus(ctrlNode: Fayde.Controls.ControlNode, recurse?: boolean): boolean {
            recurse = recurse === undefined || recurse === true;
            if (!ctrlNode.IsAttached)
                return false;

            var walker = Fayde.DeepTreeWalker(ctrlNode);
            var uin: Fayde.UINode;
            while (uin = walker.Step()) {
                if (uin.XObject.Visibility !== Fayde.Visibility.Visible) {
                    walker.SkipBranch();
                    continue;
                }

                if (!(uin instanceof Fayde.Controls.ControlNode))
                    continue;

                var cn = <Fayde.Controls.ControlNode>uin;
                var c = cn.XObject;
                if (!c.IsEnabled) {
                    if (!recurse)
                        return false;
                    walker.SkipBranch();
                    continue;
                }

                var loaded = ctrlNode.IsLoaded;
                var check: Fayde.UINode = ctrlNode;
                while (!loaded && (check = check.VisualParentNode)) {
                    loaded = loaded || check.IsLoaded;
                }

                if (loaded && cn.LayoutUpdater.assets.totalIsRenderVisible && c.IsTabStop)
                    return this._FocusNode(cn);

                if (!recurse)
                    return false;
            }
            return false;
        }
        private _FocusNode(uin?: Fayde.UINode) {
            if (uin === this.Node)
                return true;
            var fn = this.Node;
            if (fn) {
                this._ChangedEvents.push({
                    LostFocus: elementPathToRoot(fn),
                    GotFocus: null
                });
            }
            this.Node = uin;
            if (uin) {
                this._ChangedEvents.push({
                    LostFocus: null,
                    GotFocus: elementPathToRoot(uin)
                });
            }

            if (this._State.IsFirstUserInitiated)
                this.EmitChangesAsync();

            return true;
        }

        EmitChanges() {
            var evts = this._ChangedEvents;
            var cur;
            while (cur = evts.shift()) {
                this._EmitFocusList("lost", cur.LostFocus);
                this._EmitFocusList("got", cur.GotFocus);
            }
        }
        EmitChangesAsync() {
            setTimeout(() => this.EmitChanges(), 1);
        }
        private _EmitFocusList(type: string, list: UINode[]) {
            if (!list)
                return;
            var cur;
            while (cur = list.shift()) {
                cur._EmitFocusChange(type);
            }
        }
        
        FocusAnyLayer(walker: minerva.IWalker<minerva.core.Updater>) {
            if (!this.Node) {
                var top: UINode;
                for (var node;walker.step();) {
                    node = walker.current.getAttachedValue("$node");
                    if (!top)
                        top = node;
                    if (Fayde.TabNavigationWalker.Focus(node))
                        break;
                }
                if (!this.Node && top)
                    this._FocusNode(top);
            }
            if (this._State.IsFirstUserInitiated)
                this.EmitChangesAsync();
        }
    }

    function elementPathToRoot(source: UINode): UINode[] {
        var list: UINode[] = [];
        while (source) {
            list.push(source);
            source = source.VisualParentNode;
        }
        return list;
    }
}