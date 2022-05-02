/// <reference path="DependencyObject.ts" />
/// <reference path="XamlObjectCollection.ts" />

// http://msdn.microsoft.com/en-us/library/cc903952(v=vs.95).aspx
module Fayde {
    export interface IResourcable {
        Resources: Fayde.ResourceDictionary;
    }

    export class ResourceDictionaryCollection extends XamlObjectCollection<ResourceDictionary> {
        Get (key: any): any {
            for (var en = this.getEnumerator(); en.moveNext();) {
                var cur = en.current.Get(key);
                if (cur !== undefined)
                    return cur;
            }
            return undefined;
        }

        AddingToCollection (value: ResourceDictionary, error: BError): boolean {
            if (!super.AddingToCollection(value, error))
                return false;
            return this._AssertNoCycles(value, value.XamlNode.ParentNode, error);
        }

        private _AssertNoCycles (subtreeRoot: ResourceDictionary, firstAncestorNode: XamlNode, error: BError) {
            var curNode = firstAncestorNode;
            while (curNode) {
                var rd = <ResourceDictionary>curNode.XObject;
                if (rd instanceof ResourceDictionary) {
                    var cycleFound = false;
                    if (rd === subtreeRoot)
                        cycleFound = true;
                    else if (rd.Source && nullstone.equals(rd.Source, subtreeRoot.Source))
                        cycleFound = true;

                    if (cycleFound) {
                        error.Message = "Cycle found in resource dictionaries.";
                        error.Number = BError.InvalidOperation;
                        return false;
                    }
                }
                curNode = curNode.ParentNode;
            }

            for (var en = subtreeRoot.MergedDictionaries.getEnumerator(); en.moveNext();) {
                if (!this._AssertNoCycles(en.current, firstAncestorNode, error))
                    return false;
            }

            return true;
        }
    }
    Fayde.CoreLibrary.add(ResourceDictionaryCollection);

    export class ResourceDictionary extends XamlObject implements nullstone.IEnumerable<any> {
        private _Keys: any[] = [];
        private _Values: any[] = [];

        private _IsSourceLoaded: boolean = false;
        private _SourceBacking: ResourceDictionary = null;

        private _MergedDictionaries: ResourceDictionaryCollection;
        get MergedDictionaries (): ResourceDictionaryCollection {
            var md = this._MergedDictionaries;
            if (!md) {
                md = this._MergedDictionaries = new ResourceDictionaryCollection();
                md.AttachTo(this);
            }
            return md;
        }

        Source: Uri;
        App: Application;

        get Count (): number {
            return this._Values.length;
        }

        AttachTo (xobj: XamlObject) {
            var error = new BError();
            if (!this.XamlNode.AttachTo(xobj.XamlNode, error))
                error.ThrowException();
        }

        Contains (key: any): boolean {
            return this._Keys.indexOf(key) > -1;
        }

        Get (key: any): any {
            if (!!this.Source) {
                return this._GetFromSource(key);
            }
            var index = this._Keys.indexOf(key);
            if (index > -1)
                return this._Values[index];
            var md = this._MergedDictionaries;
            if (md)
                return md.Get(key);
            return undefined;
        }

        Set (key: any, value: any): boolean {
            if (key === undefined)
                return false;
            if (value === undefined)
                return this.Remove(key);

            var index = this._Keys.indexOf(key);
            var error = new BError();
            if (value instanceof XamlObject && !(<XamlObject>value).XamlNode.AttachTo(this.XamlNode, error)) {
                if (error.Message)
                    throw new Exception(error.Message);
                return false;
            }

            if (index < 0) {
                this._Keys.push(key);
                this._Values.push(value);
            } else {
                var oldValue = this._Values[index];
                this._Keys[index] = key;
                this._Values[index] = value;
                if (oldValue instanceof XamlObject)
                    (<XamlObject>oldValue).XamlNode.Detach();
            }
            return true;
        }

        Remove (key: any): boolean {
            var index = this._Keys.indexOf(key);
            if (index < 0)
                return false;
            this._Keys.splice(index, 1);
            var oldvalue = this._Values.splice(index, 1)[0];
            if (oldvalue instanceof XamlObject)
                (<XamlObject>oldvalue).XamlNode.Detach();
        }

        getEnumerator (reverse?: boolean): nullstone.IEnumerator<any> {
            return nullstone.IEnumerator_.fromArray(this._Values, reverse);
        }

        GetNodeEnumerator<U extends XamlNode>(reverse?: boolean): nullstone.IEnumerator<U> {
            var prev = this.getEnumerator(reverse);
            return {
                current: undefined,
                moveNext: function (): boolean {
                    if (prev.moveNext()) {
                        this.current = undefined;
                        return false;
                    }
                    var xobj = prev.current;
                    this.current = xobj.XamlNode;
                    return true;
                }
            };
        }

        private _GetFromSource (key: any): any {
            if (!this._IsSourceLoaded) {
                this._SourceBacking = Markup.Load<ResourceDictionary>(this.App, nullstone.markup.xaml.XamlMarkup.create(this.Source));
                this._IsSourceLoaded = true;
            }
            return this._SourceBacking.Get(key);
        }
    }
    Fayde.CoreLibrary.add(ResourceDictionary);
}