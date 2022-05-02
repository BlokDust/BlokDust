module Fayde.Markup {
    import XamlMarkup = nullstone.markup.xaml.XamlMarkup;

    export function Resolve (uri: string);
    export function Resolve (uri: Uri);
    export function Resolve (uri: any): nullstone.async.IAsyncRequest<XamlMarkup> {
        return nullstone.async.create((resolve, reject) => {
            XamlMarkup.create(uri)
                .loadAsync()
                .then(xm => {
                    var co = collector.create();
                    return nullstone.async.many([
                        xm.resolve(Fayde.TypeManager, co.collect),
                        co.resolve()
                    ]).then(() => resolve(xm), reject);
                }, reject);
        });
    }

    module collector {
        export interface ICollector {
            collect(ownerUri: string, ownerName: string, propName: string, val: any);
            resolve(): nullstone.async.IAsyncRequest<any>;
        }

        export function create (): ICollector {
            var rduris: string[] = [];
            return {
                collect (ownerUri: string, ownerName: string, propName: string, val: any) {
                    if (ownerUri === Fayde.XMLNS && ownerName === "ResourceDictionary" && propName === "Source")
                        rduris.push(val);
                },
                resolve (): nullstone.async.IAsyncRequest<any> {
                    return nullstone.async.many(rduris.map(Resolve));
                }
            };
        }
    }
}