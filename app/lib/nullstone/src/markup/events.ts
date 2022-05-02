module nullstone.markup.events {
    export interface IResolveType {
        (xmlns: string, name: string): IOutType;
    }
    export interface IResolveObject {
        (type: any): any;
    }
    export interface IResolvePrimitive {
        (type: any, text: string): any;
    }
    export interface IResolveResources {
        (owner: any, ownerType: any): any;
    }
    export interface IBranchSkip<T> {
        (root: T, obj: any);
    }
    export interface IObject {
        (obj: any, isContent: boolean);
    }
    export interface IObjectEnd {
        (obj: any, key: any, isContent: boolean, prev: any);
    }
    export interface IText {
        (text: string);
    }
    export interface IName {
        (name: string);
    }
    export interface IPropertyStart {
        (ownerType: any, propName: string);
    }
    export interface IPropertyEnd {
        (ownerType: any, propName: string);
    }
    export interface IAttributeStart {
        (ownerType: any, attrName: string);
    }
    export interface IAttributeEnd {
        (ownerType: any, attrName: string, obj: any);
    }
    export interface IResumableError {
        (e: Error): boolean;
    }
    export interface IError {
        (e: Error);
    }
}
