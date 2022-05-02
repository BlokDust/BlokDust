module Fayde.Markup.Internal {
    export interface IActiveObject {
        obj: any;
        xo: XamlObject;
        dobj: DependencyObject;
        rd: ResourceDictionary;
        coll: nullstone.ICollection<any>;
        arr: any[];
        type: any;
        set(obj: any);
        setName(name: string);
        getApp(): Application;
    }

    export function createActiveObject (app: Application, namescope: NameScope, bindingSource: any): IActiveObject {
        return {
            obj: null,
            xo: null,
            dobj: null,
            rd: null,
            coll: null,
            arr: null,
            type: null,
            set (obj: any) {
                this.obj = obj;
                this.type = obj ? obj.constructor : null;
                this.rd = (obj instanceof ResourceDictionary) ? obj : null;
                if (this.rd) {
                    this.rd.App = app;
                }
                this.dobj = (obj instanceof DependencyObject) ? obj : null;
                var xo = this.xo = (obj instanceof XamlObject) ? obj : null;
                if (xo) {
                    xo.XamlNode.DocNameScope = namescope;
                    xo.TemplateOwner = bindingSource;
                    xo.App = app;
                }
                if (obj instanceof Application) {
                    app = obj;
                }
                this.coll = nullstone.ICollection_.as(obj);
                this.arr = (typeof obj === "array") ? obj : null;
            },
            setName (name: string) {
                if (this.xo) {
                    var xnode = this.xo.XamlNode;
                    namescope.RegisterName(name, xnode);
                    xnode.Name = name;
                }
            },
            getApp () {
                return app;
            }
        };
    }
}