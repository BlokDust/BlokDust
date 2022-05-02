module minerva.text {
    export interface IDocumentLayout<T extends IDocumentLayoutDef, TAssets extends IDocumentAssets> {
        def: T;
        assets: TAssets;
    }

    export function createDocumentLayout<T extends IDocumentLayoutDef, TAssets extends IDocumentAssets> (def: T): IDocumentLayout<T, TAssets> {
        return {
            def: def,
            assets: <TAssets>def.createAssets()
        };
    }
}