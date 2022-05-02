module nullstone {
    export interface ITypeResolver {
        resolveType(moduleName: string, name: string, /* out */oresolve: IOutType): boolean;
    }
}