module Fayde.Markup.Internal {
    export interface IObjectActor {
        start();
        end();
    }

    export function createObjectActor (pactor: IPropertyActor): IObjectActor {
        var arr = [];

        return {
            start () {
                var nstate = {};
                pactor.init(nstate);
                arr.push(nstate);
            },
            end () {
                arr.pop();
                pactor.init(arr[arr.length - 1]);
            }
        };
    }
}