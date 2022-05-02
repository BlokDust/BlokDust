module Fayde {
    export class XamlObject implements Providers.IIsPropertyInheritable {
        private static _LastID: number = 0;
        private _ID: number;
        XamlNode: Fayde.XamlNode;
        TemplateOwner: DependencyObject = null;
        App: Application = null;

        constructor() {
            this._ID = XamlObject._LastID++;
            this.XamlNode = this.CreateNode();
        }
        CreateNode(): XamlNode {
            return new XamlNode(this);
        }
        get Name() { return this.XamlNode.Name; }
        get Parent(): XamlObject {
            var pn = this.XamlNode.ParentNode;
            if (!pn) return;
            return pn.XObject;
        }

        FindName(name: string, doc?: boolean): XamlObject {
            var n = this.XamlNode.FindName(name, doc);
            return n ? n.XObject : undefined;
        }

        Clone(): XamlObject {
            var xobj: XamlObject = new (<any>this).constructor();
            xobj.CloneCore(this);
            return xobj;
        }
        CloneCore(source: XamlObject) { }

        IsInheritable(propd: DependencyProperty): boolean { return false; }
    }
    Fayde.CoreLibrary.add(XamlObject);
}