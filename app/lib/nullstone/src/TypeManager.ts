/// <reference path="Uri" />

module nullstone {
    export interface IOutType {
        type: any;
        isPrimitive: boolean;
    }

    export interface ITypeManager {
        defaultUri: string;
        xUri: string;
        resolveLibrary (uri: string): ILibrary;
        loadTypeAsync (uri: string, name: string): Promise<any>;
        resolveType(uri: string, name: string, /* out */oresolve: IOutType): boolean;
        add (uri: string, name: string, type: any): ITypeManager;
        addPrimitive (uri: string, name: string, type: any): ITypeManager;
        addEnum (uri: string, name: string, enu: any): ITypeManager;
    }
    export class TypeManager implements ITypeManager {
        libResolver: ILibraryResolver;

        constructor (public defaultUri: string, public xUri: string) {
            this.libResolver = this.createLibResolver();

            this.libResolver.resolve(defaultUri)
                .add(Array, "Array");

            this.libResolver.resolve(xUri)
                .addPrimitive(String, "String")
                .addPrimitive(Number, "Number")
                .addPrimitive(Number, "Double")
                .addPrimitive(Date, "Date")
                .addPrimitive(RegExp, "RegExp")
                .addPrimitive(Boolean, "Boolean")
                .addPrimitive(Uri, "Uri");
        }

        createLibResolver (): ILibraryResolver {
            return new LibraryResolver();
        }

        resolveLibrary (uri: string): ILibrary {
            return this.libResolver.resolve(uri || this.defaultUri);
        }

        loadTypeAsync (uri: string, name: string): Promise<any> {
            return this.libResolver.loadTypeAsync(uri || this.defaultUri, name);
        }

        resolveType (uri: string, name: string, /* out */oresolve: IOutType): boolean {
            oresolve.isPrimitive = false;
            oresolve.type = undefined;
            return this.libResolver.resolveType(uri || this.defaultUri, name, oresolve);
        }

        add (uri: string, name: string, type: any): ITypeManager {
            var lib = this.libResolver.resolve(uri || this.defaultUri);
            if (lib)
                lib.add(type, name);
            return this;
        }

        addPrimitive (uri: string, name: string, type: any): ITypeManager {
            var lib = this.libResolver.resolve(uri || this.defaultUri);
            if (lib)
                lib.addPrimitive(type, name);
            return this;
        }

        addEnum (uri: string, name: string, enu: any): ITypeManager {
            var lib = this.libResolver.resolve(uri || this.defaultUri);
            if (lib)
                lib.addEnum(enu, name);
            return this;
        }
    }
}