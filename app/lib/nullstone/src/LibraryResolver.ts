module nullstone {
    interface ILibraryHash {
        [id:string]: ILibrary;
    }
    export interface ILibraryResolver extends ITypeResolver {
        libraryCreated: Event<IEventArgs>;
        loadTypeAsync(uri: string, name: string): Promise<any>;
        resolve(uri: string): ILibrary;
    }

    export interface ILibraryCreatedEventArgs extends IEventArgs {
        library: ILibrary;
    }

    //NOTE:
    //  Library Uri syntax
    //      http://...
    //      lib://<library>[/<namespace>]
    //      <dir>
    export class LibraryResolver implements ILibraryResolver {
        private $$libs: ILibraryHash = {};

        libraryCreated = new Event();

        dirResolver = new DirResolver();

        createLibrary (uri: string): ILibrary {
            return new Library(uri);
        }

        loadTypeAsync (uri: string, name: string): Promise<any> {
            var lib = this.resolve(uri);
            if (!lib)
                return this.dirResolver.loadAsync(uri, name);
            return lib.loadAsync()
                .then((lib) => {
                    var oresolve = {isPrimitive: false, type: undefined};
                    if (lib.resolveType(null, name, oresolve))
                        return oresolve.type;
                    return null;
                });
        }

        resolve (uri: string): ILibrary {
            var libUri = new Uri(uri);
            var scheme = libUri.scheme;
            if (!scheme)
                return null;

            var libName = (scheme === "lib") ? libUri.host : uri;
            var lib = this.$$libs[libName];
            if (!lib) {
                lib = this.$$libs[libName] = this.createLibrary(libName);
                this.$$onLibraryCreated(lib);
            }
            return lib;
        }

        resolveType (uri: string, name: string, /* out */oresolve: IOutType): boolean {
            var libUri = new Uri(uri);
            var scheme = libUri.scheme;
            if (!scheme)
                return this.dirResolver.resolveType(uri, name, oresolve);

            var libName = (scheme === "lib") ? libUri.host : uri;
            var modName = (scheme === "lib") ? libUri.absolutePath : "";
            var lib = this.$$libs[libName];
            if (!lib) {
                lib = this.$$libs[libName] = this.createLibrary(libName);
                this.$$onLibraryCreated(lib);
            }
            return lib.resolveType(modName, name, oresolve);
        }

        private $$onLibraryCreated (lib: ILibrary) {
            this.libraryCreated.raise(this, Object.freeze({library: lib}));
        }
    }
}