module nullstone.markup {
    export interface ICustomCollector {
        (ownerUri: string, ownerName: string, propName: string, val: any);
    }
    export interface ICustomExcluder {
        (uri: string, name: string): boolean;
    }
    export interface IMarkupDependencyResolver<T> {
        add(uri: string, name: string): boolean;
        collect(root: T, customCollector?: ICustomCollector, customExcluder?: ICustomExcluder);
        resolve(): Promise<any>;
    }
    export class MarkupDependencyResolver<T> implements IMarkupDependencyResolver<T> {
        private $$uris: string[] = [];
        private $$names: string[] = [];
        private $$fulls: string[] = [];

        constructor(public typeManager: ITypeManager, public parser: IMarkupParser<T>) {
        }

        collect(root: T, customCollector?: ICustomCollector, customExcluder?: ICustomExcluder) {
            //TODO: We need to collect
            //  ResourceDictionary.Source
            //  Application.ThemeName
            var blank = {};
            var oresolve: IOutType = {
                isPrimitive: false,
                type: Object
            };
            var last = {
                uri: "",
                name: "",
                obj: undefined
            };
            var parse = {
                resolveType: (uri, name) => {
                    uri = uri || this.typeManager.defaultUri;
                    if (!customExcluder || !customExcluder(uri, name))
                        this.add(uri, name);
                    last.uri = uri;
                    last.name = name;
                    return oresolve;
                },
                resolveObject: (type) => {
                    return blank;
                },
                objectEnd: (obj, isContent, prev) => {
                    last.obj = obj;
                },
                propertyEnd: (ownerType, propName) => {
                },
                attributeEnd: (ownerType, attrName, obj) => {
                }
            };
            if (customCollector) {
                parse.propertyEnd = (ownerType, propName) => {
                    customCollector(last.uri, last.name, propName, last.obj);
                };
                parse.attributeEnd = (ownerType, attrName, obj) => {
                    customCollector(last.uri, last.name, attrName, obj);
                };
            }

            this.parser
                .on(parse)
                .parse(root);
        }

        add(uri: string, name: string): boolean {
            var uris = this.$$uris;
            var names = this.$$names;

            if (this.typeManager.resolveLibrary(uri) == null) {
                //Hit directory resolution
                var full = uri + "/" + name;
                if (this.$$fulls.indexOf(full) > -1)
                    return false;
                this.$$fulls.push(full);
            } else {
                //Hit library
                if (uris.indexOf(uri) > -1)
                    return false;
            }

            uris.push(uri);
            names.push(name);
            return true;
        }

        resolve(): Promise<any> {
            var proms: Promise<any>[] = [];
            for (var i = 0, uris = this.$$uris, names = this.$$names, tm = this.typeManager; i < uris.length; i++) {
                proms.push(tm.loadTypeAsync(uris[i], names[i]));
            }
            return Promise.all(proms);
        }
    }
}