module Fayde {
    export interface IIsAttachedMonitor {
        Callback: (newIsAttached: boolean) => void;
        Detach();
    }

    export class XamlNode {
        XObject: XamlObject;
        ParentNode: XamlNode = null;
        Name: string = "";
        NameScope: NameScope = null;
        DocNameScope: NameScope = null;
        private IsShareable: boolean = false;
        private _OwnerNameScope: NameScope = null;
        private _LogicalChildren: XamlNode[] = [];

        private _IAMonitors: IIsAttachedMonitor[] = null;

        constructor(xobj: XamlObject) {
            this.XObject = xobj;
        }

        private _DataContext: any = undefined;
        get DataContext(): any { return this._DataContext; }
        set DataContext(value: any) {
            var old = this._DataContext;
            if (old === value)
                return;
            this._DataContext = value;
            this.OnDataContextChanged(old, value);
        }
        OnDataContextChanged(oldDataContext: any, newDataContext: any) {
            var childNodes = this._LogicalChildren;
            var len = childNodes.length;
            var childNode: XamlNode = null;
            for (var i = 0; i < len; i++) {
                childNode = childNodes[i];
                childNode.DataContext = newDataContext;
            }
        }

        private _IsEnabled: boolean = true;
        get IsEnabled(): boolean { return this._IsEnabled; }
        set IsEnabled(value: boolean) {
            value = value !== false;
            var old = this._IsEnabled;
            if (old === value)
                return;
            this._IsEnabled = value;
            this.OnIsEnabledChanged(old, value);
        }
        OnIsEnabledChanged(oldValue: boolean, newValue: boolean) {
            var childNodes = this._LogicalChildren;
            var len = childNodes.length;
            var childNode: XamlNode = null;
            for (var i = 0; i < len; i++) {
                childNode = childNodes[i];
                childNode.IsEnabled = newValue;
            }
        }

        FindName(name: string, doc?: boolean): XamlNode {
            var scope = this.FindNameScope();
            var node: XamlNode;
            if (scope)
                node = scope.FindName(name);
            var docscope: NameScope;;
            if (!node && doc && (docscope = this.DocNameScope))
                node = docscope.FindName(name);
            return node;
        }
        SetName(name: string) {
            this.Name = name;
            var ns = this.FindNameScope();
            if (ns)
                ns.RegisterName(name, this);
        }
        FindNameScope(): NameScope {
            if (this._OwnerNameScope)
                return this._OwnerNameScope;

            var curNode = this;
            var ns;
            while (curNode) {
                ns = curNode.NameScope;
                if (ns) {
                    this._OwnerNameScope = ns;
                    return ns;
                }
                curNode = curNode.ParentNode;
            }
            return undefined;
        }

        IsAttached: boolean = false;
        SetIsAttached(value: boolean) {
            if (this.IsAttached === value)
                return;
            this.IsAttached = value;
            this.OnIsAttachedChanged(value);
        }
        OnIsAttachedChanged(newIsAttached: boolean) {
            var xobj = this.XObject;
            if (newIsAttached && this.ParentNode && !xobj.App) {
                xobj.App = this.ParentNode.XObject.App;
            }

            var childNodes = this._LogicalChildren;
            var len = childNodes.length;
            var childNode: XamlNode = null;
            for (var i = 0; i < len; i++) {
                childNode = childNodes[i];
                childNode.SetIsAttached(newIsAttached);
            }

            for (var i = 0, monitors = (this._IAMonitors || []).slice(0), len = monitors.length; i < len; i++) {
                monitors[i].Callback(newIsAttached);
            }

            if (!newIsAttached)
                this._OwnerNameScope = undefined;
        }
        MonitorIsAttached(func: (newIsAttached: boolean) => void ): IIsAttachedMonitor {
            var monitors = this._IAMonitors;
            if (!monitors) this._IAMonitors = monitors = [];
            var monitor: IIsAttachedMonitor = {
                Callback: func,
                Detach: null
            };
            monitor.Detach = function () {
                var index = monitors.indexOf(monitor);
                if (index > -1) monitors.splice(index, 1);
            };
            this._IAMonitors.push(monitor);
            return monitor;
        }

        AttachTo(parentNode: XamlNode, error: BError): boolean {
            if (this.ParentNode && this.IsShareable)
                return true;
            var data = {
                ParentNode: parentNode,
                ChildNode: this,
                Name: ""
            };
            var curNode = parentNode;
            while (curNode) {
                if (curNode === this) {
                    error.Message = "Cycle found.";
                    error.Data = data;
                    error.Number = BError.Attach;
                    return false;
                }
                curNode = curNode.ParentNode;
            }

            if (this.ParentNode) {
                if (this.ParentNode === parentNode)
                    return true;
                error.Message = "Element is already a child of another element.";
                error.Data = data;
                error.Number = BError.Attach;
                return false;
            }

            var parentScope = parentNode.FindNameScope();
            var thisScope = this.NameScope;
            if (thisScope) {
                if (!thisScope.IsRoot) {
                    parentScope.Absorb(thisScope);
                    this.NameScope = null;
                    this._OwnerNameScope = parentScope;
                }
            } else if (parentScope) {
                var name = this.Name;
                if (name) {
                    var existing = parentScope.FindName(name);
                    if (existing && existing !== this) {
                        error.Message = "Name is already registered in parent namescope.";
                        data.Name = name;
                        error.Data = data;
                        error.Number = BError.Attach;
                        return false;
                    }
                    parentScope.RegisterName(name, this);
                }
                this._OwnerNameScope = parentScope;
            }

            var old = this.ParentNode;
            this.ParentNode = parentNode;
            this.OnParentChanged(old, parentNode);
            
            parentNode._LogicalChildren.push(this);
            this.SetIsAttached(parentNode.IsAttached);

            return true;
        }
        Detach() {
            var name = this.Name;
            if (name && !this.NameScope) {
                var ns = this.FindNameScope();
                if (ns) ns.UnregisterName(this.Name);
            }
            this._OwnerNameScope = null;
            this.SetIsAttached(false);
            var old = this.ParentNode;
            this.ParentNode = null;
            if (old) {
                var index = old._LogicalChildren.indexOf(this);
                if (index > -1) old._LogicalChildren.splice(index, 1);
                this.OnParentChanged(old, null);
            }
        }
        OnParentChanged(oldParentNode: XamlNode, newParentNode: XamlNode) { }

        GetInheritedEnumerator(): nullstone.IEnumerator<DONode> { return undefined; }

        static SetShareable(xn: XamlNode) {
            xn.IsShareable = true;
        }
    }
}