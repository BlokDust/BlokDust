module Fayde.Markup.Internal {
    export interface IPropertyActor {
        init(nstate: any);
        start(ownerType: any, name: string);
        startContent();
        end();
        addObject(obj: any, key?: any);
        setContentText(text: string);
        setObject(ownerType: any, name: string, obj: any);
        isNewResources (): boolean;
    }

    export function createPropertyActor (cur: IActiveObject, extractType: (text: string) => any, extractDP: (text: string) => any): IPropertyActor {
        var state = {
            visited: undefined,

            coll: undefined,
            arr: undefined,
            propd: undefined,
            prop: undefined,
            eprop: undefined,
            incontent: undefined,
            content: {
                count: 0,
                coll: undefined,
                arr: undefined,
                rd: undefined,
                propd: undefined,
                app: undefined
            }
        };

        function verify (ownerType: any, name: string) {
            var otype = ownerType || cur.type;
            state.visited = state.visited || [];
            var tvisited = state.visited[otype];
            if (!tvisited) {
                tvisited = state.visited[otype] = [];
            } else {
                if (tvisited.indexOf(name) > -1)
                    throw new XamlParseException("Cannot set [" + otype.name + "][" + name + "] more than once.");
            }
            tvisited.push(name);
        }

        function verifyContent () {
            verify(cur.type, state.propd.Name);
        }

        function prepare (ownerType: any, name: string): boolean {
            if (state.coll || state.arr || state.propd || state.prop || state.eprop)
                return true;
            if (cur.dobj) {
                var otype = ownerType || cur.type;
                state.propd = DependencyProperty.GetDependencyProperty(otype, name, true);
                if (!state.propd) {
                    var ev = cur.dobj[name];
                    if (ev instanceof nullstone.Event)
                        state.eprop = name;
                    else
                        state.prop = name;
                    return true;
                }
                if (state.propd.IsImmutable) {
                    var co = cur.dobj.GetValue(state.propd);
                    state.coll = nullstone.ICollection_.as(co);
                    state.arr = (typeof co === "array") ? co : null;
                } else {
                    var tt = state.propd.GetTargetType();
                    if (nullstone.ICollection_.is(tt.prototype))
                        cur.dobj.SetValue(state.propd, state.coll = new tt());
                    else if (tt === Array)
                        cur.dobj.SetValue(state.propd, state.arr = []);
                }
                return true;
            } else if (cur.rd && name === "MergedDictionaries") {
                state.coll = cur.rd.MergedDictionaries;
                return true;
            } else if (cur.obj) {
                if (ownerType && cur.type !== ownerType)
                    throw new XamlParseException("Cannot set Attached Property on object that is not a DependencyObject.");
                state.prop = name;
                return true;
            }
            return false;
        }

        function prepareContent (): boolean {
            var content = state.content = state.content || <any>{};
            if (content.coll || content.arr || content.rd || content.propd)
                return true;
            var propd = content.propd = Content.Get(cur.type);
            if (!propd) {
                content.coll = nullstone.ICollection_.as(cur.obj);
                content.arr = (typeof cur.obj === "array") ? cur.obj : null;
                content.rd = cur.rd;
                content.app = (cur.obj instanceof Application) ? cur.obj : null;
                if (content.coll || content.arr || content.rd || content.app)
                    return true;
                throw new XamlParseException("Cannot set content for object of type '" + cur.type.name + "'.");
            }
            if (!propd.IsImmutable)
                return true;
            var co = cur.dobj.GetValue(propd);
            if (!co)
                return false;
            content.coll = nullstone.ICollection_.as(co);
            content.arr = (typeof co === "array") ? co : null;
            return true;
        }

        function addContentObject (obj: any, key: any) {
            if (cur.rd) {
                key = key || getFallbackKey(obj);
                if (!key)
                    throw new XamlParseException("Items in a ResourceDictionary must have a x:Key.");
                cur.rd.Set(key, obj);
            } else if (cur.coll) {
                cur.coll.Add(obj);
            } else if (cur.arr) {
                cur.arr.push(obj);
            } else if (cur.dobj) {
                if (state.content.coll) {
                    state.content.coll.Add(obj);
                } else if (state.content.arr) {
                    state.content.arr.push(obj);
                } else if (state.content.rd) {
                    key = key || getFallbackKey(obj);
                    if (!key)
                        throw new XamlParseException("Items in a ResourceDictionary must have a x:Key.");
                    state.content.rd.Set(obj, key);
                } else if (state.content.app) {
                    state.content.app.$$SetRootVisual(obj);
                } else {
                    if (state.content.count > 0)
                        throw new XamlParseException("Cannot set content more than once.");
                    cur.dobj.SetValue(state.content.propd, obj);
                }
            }
            state.content.count++;
        }

        function addObject (obj: any, key: any) {
            if (state.coll) {
                state.coll.Add(obj);
            } else if (state.arr) {
                state.arr.push(obj);
            } else if (state.propd) {
                cur.dobj.SetValue(state.propd, convert(state.propd, obj));
            } else if (state.prop) {
                cur.obj[state.prop] = obj;
            } else if (state.eprop) {
                subscribeEvent(state.eprop, obj);
            }
        }

        function setAttrObject (ownerType: any, name: string, obj: any): boolean {
            if (cur.dobj) {
                var otype = ownerType || cur.type;
                var propd = DependencyProperty.GetDependencyProperty(otype, name, true);
                if (!propd) {
                    var ev = cur.dobj[name];
                    if (ev instanceof nullstone.Event) {
                        subscribeEvent(name, obj);
                    } else {
                        cur.dobj[name] = obj;
                    }
                    return true;
                }
                if (propd.IsImmutable) {
                    return merge(convert(propd, obj), cur.dobj.GetValue(propd));
                } else {
                    cur.dobj.SetValue(propd, convert(propd, obj));
                    return true;
                }
            } else if (cur.obj) {
                var ev = cur.obj[name];
                if (ev instanceof nullstone.Event) {
                    subscribeEvent(name, obj);
                } else {
                    cur.obj[name] = obj;
                }
                return true;
            }
            return false;
        }

        function merge (src: any, target: any): boolean {
            var sarr: any[];
            var scoll = <nullstone.ICollection<any>>nullstone.ICollection_.as(src);
            if (scoll) {
                sarr = nullstone.IEnumerable_.toArray(scoll);
                scoll.Clear();
            } else if (typeof src === "array") {
                sarr = src.slice(0);
                src.length = 0;
            } else {
                return false;
            }

            var sen = nullstone.IEnumerator_.fromArray(sarr);
            var tcoll = nullstone.ICollection_.as(target);
            var tarr = typeof target === "array" ? target : null;
            if (tcoll) {
                while (sen.moveNext()) {
                    tcoll.Add(sen.current);
                }
            } else if (tarr) {
                while (sen.moveNext()) {
                    tarr.push(sen.current);
                }
            } else {
                return false;
            }

            return true;
        }

        function getFallbackKey (obj: any): any {
            if (obj instanceof XamlObject) {
                var name = (<XamlObject>obj).XamlNode.Name;
                if (name)
                    return name;
            }
            return getImplicitKey(obj);
        }

        function getImplicitKey (obj: any): any {
            if (obj instanceof DataTemplate) {
                var dt = (<DataTemplate>obj).DataType;
                if (!dt)
                    throw new XamlParseException("A DataTemplate in a ResourceDictionary must have x:Key or DataType.");
                return dt;
            } else if (obj instanceof Style) {
                var tt = (<Style>obj).TargetType;
                if (!tt)
                    throw new XamlParseException("A Style in a ResourceDictionary must have x:Key or TargetType.");
                return tt;
            }
        }

        function convert (propd: DependencyProperty, obj: any): any {
            var tt = <any>propd.GetTargetType();
            var val = obj;
            if (typeof val === "string") {
                if (tt === IType_) //NOTE: Handles implicit types that are normally written as {x:Type ...}
                    return extractType(val);
                else if (propd === Setter.PropertyProperty)
                    return extractDP(val);
            } else if (val instanceof Expression) {
                return val;
            }
            return nullstone.convertAnyToType(val, tt);
        }

        function subscribeEvent (name: string, ebe: EventBindingExpression) {
            if (!(ebe instanceof EventBindingExpression))
                throw new XamlParseException("Cannot subscribe to event '" + name + "' without {EventBinding}.");
            ebe.Init(name);
            ebe.OnAttached(cur.dobj);
        }

        return {
            init (nstate: any) {
                state = nstate;
            },
            start (ownerType: any, name: string) {
                verify(ownerType, name);
                prepare(ownerType, name);
            },
            startContent () {
                if (prepareContent()) {
                    if (state.content.count === 0)
                        verifyContent();
                    state.incontent = true;
                }
            },
            end () {
                state.incontent = false;
                state.coll = state.arr = state.propd = state.prop = state.eprop = undefined;
            },
            addObject (obj: any, key?: any) {
                if (state.incontent) {
                    addContentObject(obj, key);
                    state.content.count++;
                } else {
                    addObject(obj, key);
                }
            },
            setContentText (text: string) {
                if (!cur.dobj)
                    return;

                var tcprop = TextContent.Get(cur.type);
                if (tcprop) {
                    verify(cur.type, tcprop.Name);
                    cur.dobj.SetValue(tcprop, text);
                    return;
                }

                var cprop = Content.Get(cur.type);
                if (cprop) {
                    verify(cur.type, cprop.Name);
                    cur.dobj.SetValue(cprop, convert(cprop, text));
                }
            },
            setObject (ownerType: any, name: string, obj: any) {
                verify(ownerType, name);
                setAttrObject(ownerType, name, obj);
            },
            isNewResources (): boolean {
                if (state.coll instanceof ResourceDictionaryCollection)
                    return true;
                return !cur.rd;
            }
        };
    }
}