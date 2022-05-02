module nullstone {
    export interface ILibrary {
        name: string;
        uri: Uri;
        sourcePath: string;
        basePath: string;
        useMin: boolean;
        exports: string;
        deps: string[];
        rootModule: any;
        isLoaded: boolean;
        loadAsync (): Promise<Library>;
        resolveType (moduleName: string, name: string, /* out */oresolve: IOutType): boolean;

        add (type: any, name?: string): ILibrary;
        addPrimitive (type: any, name?: string): ILibrary;
        addEnum (enu: any, name: string): ILibrary;
    }
    export class Library implements ILibrary {
        private $$module: any = null;
        private $$sourcePath: string = null;
        private $$basePath: string = null;

        private $$primtypes: any = {};
        private $$types: any = {};

        private $$loaded = false;

        name: string;
        uri: Uri;
        exports: string;
        deps: string[];
        useMin: boolean;

        get sourcePath (): string {
            var base = this.$$sourcePath || 'lib/' + this.name + '/dist/' + this.name;
            if (!this.useMin)
                return base;
            return base + ".min";
        }

        set sourcePath (value: string) {
            if (value.substr(value.length - 3) === '.js')
                value = value.substr(0, value.length - 3);
            if (this.useMin && value.substr(value.length - 4) === ".min")
                value = value.substr(0, value.length - 4);
            this.$$sourcePath = value;
        }

        get basePath (): string {
            return this.$$basePath || ("lib/" + this.name);
        }

        set basePath (value: string) {
            this.$$basePath = value;
        }

        get isLoaded (): boolean {
            return !!this.$$loaded;
        }

        constructor (name: string) {
            Object.defineProperty(this, "name", {value: name, writable: false});
            var uri = name;
            if (name.indexOf("http://") !== 0)
                uri = "lib://" + name;
            Object.defineProperty(this, "uri", {value: new Uri(uri), writable: false});
        }

        get rootModule (): any {
            return this.$$module = this.$$module || require(this.sourcePath);
        }

        loadAsync (): Promise<Library> {
            //NOTE: If using http library scheme and a custom source path was not set, we assume the library is preloaded
            if (!this.$$sourcePath && this.uri.scheme === "http")
                this.$$loaded = true;
            if (this.$$loaded)
                return Promise.resolve(this);
            this.$configModule();
            return new Promise((resolve, reject) => {
                (<Function>require)([this.name], (rootModule) => {
                    this.$$module = rootModule;
                    this.$$loaded = true;
                    resolve(this);
                }, (err) => reject(new LibraryLoadError(this, err)));
            });
        }

        private $configModule () {
            var co = <RequireConfig>{
                paths: {},
                shim: {},
                map: {
                    "*": {}
                }
            };
            var srcPath = this.sourcePath;
            co.paths[this.name] = srcPath;
            co.shim[this.name] = {
                exports: this.exports,
                deps: this.deps
            };
            co.map['*'][srcPath] = this.name;
            require.config(co);
        }

        resolveType (moduleName: string, name: string, /* out */oresolve: IOutType): boolean {
            if (!moduleName) {
                //Library URI: http://.../
                oresolve.isPrimitive = true;
                if ((oresolve.type = this.$$primtypes[name]) !== undefined)
                    return true;
                oresolve.isPrimitive = false;
                return (oresolve.type = this.$$types[name]) !== undefined;
            }

            //Library URI: lib://.../
            var curModule = this.rootModule;
            oresolve.isPrimitive = false;
            oresolve.type = undefined;
            if (moduleName !== "/") {
                for (var i = 0, tokens = moduleName.substr(1).split('.'); i < tokens.length && !!curModule; i++) {
                    curModule = curModule[tokens[i]];
                }
            }
            if (!curModule)
                return false;
            oresolve.type = curModule[name];
            var type = oresolve.type;
            if (type === undefined)
                return false;
            setTypeUri(type, this.uri);
            return true;
        }

        add (type: any, name?: string): ILibrary {
            if (!type)
                throw new Error("A type must be specified when registering '" + name + "'`.");
            name = name || getTypeName(type);
            if (!name)
                throw new Error("No type name found.");
            setTypeUri(type, this.uri);
            this.$$types[name] = type;
            return this;
        }

        addPrimitive (type: any, name?: string): ILibrary {
            if (!type)
                throw new Error("A type must be specified when registering '" + name + "'`.");
            name = name || getTypeName(type);
            if (!name)
                throw new Error("No type name found.");
            setTypeUri(type, this.uri);
            this.$$primtypes[name] = type;
            return this;
        }

        addEnum (enu: any, name: string): ILibrary {
            this.addPrimitive(enu, name);
            Object.defineProperty(enu, "$$enum", {value: true, writable: false});
            enu.name = name;
            return this;
        }
    }

    function setTypeUri (type: any, uri: Uri) {
        if (type.$$uri)
            return;
        Object.defineProperty(type, "$$uri", {value: uri.toString(), enumerable: false});
    }
}