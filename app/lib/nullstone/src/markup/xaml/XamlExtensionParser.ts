module nullstone.markup.xaml {
    // Syntax:
    //      {<Alias|Name> [<DefaultKey>=]<DefaultValue>|<Key>=<Value>}
    // Examples:
    //  {x:Null }
    //  {x:Type }
    //  {x:Static }
    //  {TemplateBinding }
    //  {Binding }
    //  {StaticResource }

    interface IParseContext {
        text: string;
        i: number;
        acc: string;
        error: any;
        resolver: INsPrefixResolver;
    }
    export class XamlExtensionParser implements IMarkupExtensionParser {
        private $$defaultXmlns = "http://schemas.wsick.com/fayde";
        private $$xXmlns = "http://schemas.wsick.com/fayde/x";

        private $$onResolveType: events.IResolveType;
        private $$onResolveObject: events.IResolveObject;
        private $$onResolvePrimitive: events.IResolvePrimitive;
        private $$onError: events.IError;

        setNamespaces (defaultXmlns: string, xXmlns: string): XamlExtensionParser {
            this.$$defaultXmlns = defaultXmlns;
            this.$$xXmlns = xXmlns;
            return this;
        }

        parse (value: string, resolver: INsPrefixResolver, os: any[]): any {
            if (!isAlpha(value[1]))
                return value;
            this.$$ensure();
            var ctx: IParseContext = {
                text: value,
                i: 1,
                acc: "",
                error: "",
                resolver: resolver
            };
            var obj = this.$$doParse(ctx, os);
            if (ctx.error)
                this.$$onError(ctx.error);
            obj = finishMarkupExtension(obj, resolver, this.$$onResolveType, os);
            return obj;
        }

        private $$doParse (ctx: IParseContext, os: any[]): any {
            if (!this.$$parseName(ctx))
                return undefined;
            this.$$startExtension(ctx, os);

            while (ctx.i < ctx.text.length) {
                if (!this.$$parseKeyValue(ctx, os))
                    break;
                if (ctx.text[ctx.i] === "}") {
                    break;
                }
            }

            return os.pop();
        }

        private $$parseName (ctx: IParseContext): boolean {
            var ind = ctx.text.indexOf(" ", ctx.i);
            if (ind > ctx.i) {
                ctx.acc = ctx.text.substr(ctx.i, ind - ctx.i);
                ctx.i = ind + 1;
                return true;
            }
            ind = ctx.text.indexOf("}", ctx.i);
            if (ind > ctx.i) {
                ctx.acc = ctx.text.substr(ctx.i, ind - ctx.i);
                ctx.i = ind;
                return true;
            }
            ctx.error = "Missing closing bracket.";
            return false;
        }

        private $$startExtension (ctx: IParseContext, os: any[]) {
            var full = ctx.acc;
            var ind = full.indexOf(":");
            var prefix = (ind < 0) ? null : full.substr(0, ind);
            var name = (ind < 0) ? full : full.substr(ind + 1);
            var uri = prefix ? ctx.resolver.lookupNamespaceURI(prefix) : DEFAULT_XMLNS;

            var obj;
            if (uri === this.$$xXmlns) {
                if (name === "Null")
                    obj = this.$$parseXNull(ctx);
                else if (name === "Type")
                    obj = this.$$parseXType(ctx);
                else if (name === "Static")
                    obj = this.$$parseXStatic(ctx);
                else
                    throw new Error("Unknown markup extension. [" + prefix + ":" + name + "]");
            } else {
                var ort = this.$$onResolveType(uri, name);
                obj = this.$$onResolveObject(ort.type);
            }
            os.push(obj);
        }

        private $$parseXNull (ctx: IParseContext): any {
            var ind = ctx.text.indexOf("}", ctx.i);
            if (ind < ctx.i)
                throw new Error("Unterminated string constant.");
            ctx.i = ind;
            return null;
        }

        private $$parseXType (ctx: IParseContext): any {
            var end = ctx.text.indexOf("}", ctx.i);
            if (end < ctx.i)
                throw new Error("Unterminated string constant.");
            var val = ctx.text.substr(ctx.i, end - ctx.i);
            ctx.i = end;

            var ind = val.indexOf(":");
            var prefix = (ind < 0) ? null : val.substr(0, ind);
            var name = (ind < 0) ? val : val.substr(ind + 1);
            var uri = ctx.resolver.lookupNamespaceURI(prefix);
            var ort = this.$$onResolveType(uri, name);
            return ort.type;
        }

        private $$parseXStatic (ctx: IParseContext): any {
            var text = ctx.text;
            var len = text.length;
            var start = ctx.i;
            for (; ctx.i < len; ctx.i++) {
                if (text[ctx.i] === "}" && text[ctx.i - 1] !== "\\")
                    break;
            }
            var val = text.substr(start, ctx.i - start);

            var func = new Function("return (" + val + ");");
            return func();
        }

        private $$parseKeyValue (ctx: IParseContext, os: any[]): boolean {
            var text = ctx.text;
            ctx.acc = "";
            var key = "";
            var val: any = undefined;
            var len = text.length;
            var nonalpha = false;
            for (; ctx.i < len; ctx.i++) {
                var cur = text[ctx.i];
                if (cur === "\\") {
                    ctx.i++;
                    ctx.acc += text[ctx.i];
                } else if (cur === "{") {
                    if (nonalpha || !isAlpha(text[ctx.i + 1])) {
                        ctx.acc += cur;
                        nonalpha = true;
                        continue;
                    }
                    if (!key) {
                        ctx.error = "A sub extension must be set to a key.";
                        return false;
                    }
                    ctx.i++;
                    val = this.$$doParse(ctx, os);
                    if (ctx.error)
                        return false;
                } else if (cur === "=") {
                    key = ctx.acc.trim();
                    ctx.acc = "";
                } else if (cur === "}") {
                    if (nonalpha) {
                        nonalpha = false;
                        ctx.acc += cur;
                    }
                    this.$$finishKeyValue(ctx, key, val, os);
                    return true;
                } else if (cur === ",") {
                    ctx.i++;
                    this.$$finishKeyValue(ctx, key, val, os);
                    return true;
                } else if (key && !ctx.acc && cur === "'") {
                    ctx.i++;
                    this.$$parseSingleQuoted(ctx);
                    val = ctx.acc;
                    ctx.acc = "";
                } else {
                    ctx.acc += cur;
                }
            }
            throw new Error("Unterminated string constant.");
        }

        private $$finishKeyValue (ctx: IParseContext, key: string, val: any, os: any[]) {
            if (val === undefined) {
                if (!(val = ctx.acc.trim()))
                    return;
            }

            val = finishMarkupExtension(val, ctx.resolver, this.$$onResolveType, os);
            var co = os[os.length - 1];
            if (!key) {
                co.init && co.init(val);
            } else {
                co[key] = val;
            }
        }

        private $$parseSingleQuoted (ctx: IParseContext) {
            var text = ctx.text;
            var len = text.length;
            for (; ctx.i < len; ctx.i++) {
                var cur = text[ctx.i];
                if (cur === "\\") {
                    ctx.i++;
                    ctx.acc += text[ctx.i];
                } else if (cur === "'") {
                    return;
                } else {
                    ctx.acc += cur;
                }
            }
        }

        private $$ensure () {
            this.onResolveType(this.$$onResolveType)
                .onResolveObject(this.$$onResolveObject)
                .onError(this.$$onError);
        }

        onResolveType (cb?: events.IResolveType): XamlExtensionParser {
            var oresolve: IOutType = {
                isPrimitive: false,
                type: Object
            };
            this.$$onResolveType = cb || ((xmlns, name) => oresolve);
            return this;
        }

        onResolveObject (cb?: events.IResolveObject): XamlExtensionParser {
            this.$$onResolveObject = cb || ((type) => new type());
            return this;
        }

        onResolvePrimitive (cb?: events.IResolvePrimitive): XamlExtensionParser {
            this.$$onResolvePrimitive = cb || ((type, text) => new type(text));
            return this;
        }

        onError (cb?: events.IError): XamlExtensionParser {
            this.$$onError = cb || ((e) => {
            });
            return this;
        }
    }

    function isAlpha (c: string): boolean {
        if (!c)
            return false;
        var code = c[0].toUpperCase().charCodeAt(0);
        return code >= 65 && code <= 90;
    }
}