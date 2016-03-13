import {IOperation} from '../Core/Operations/IOperation';
import {IApp} from "../IApp";

declare var App: IApp;

export class SaveOperation<String> implements IOperation {
    private _JSON: any;
    private _LZMA: any;

    constructor(json: string, compositionId?: string, sessionId?: string) {

        this._JSON = new PostData(
            (compositionId) ? compositionId : "",
            json,
            (sessionId) ? sessionId : ""
        );

        this._LZMA = new LZMA("/lib/lzma/src/lzma_worker.js");
    }

    Compress(data: string): Promise<string>{

        return new Promise((resolve) => {

            var compressionLevel: number = 5;

            this._LZMA.compress(data, compressionLevel,
                function(result) {
                    resolve(result.toString());
                },
                function(percent) {
                    //console.log(percent);
                }
            );
        });
    }

    Do(): Promise<String> {
        var that = this;

        return new Promise((resolve, reject) => {

            that.Compress(that._JSON.Data).then((compressed) => {

                that._JSON.Data = compressed;

                var data = JSON.stringify(that._JSON);

                var url: string = (App.IsLocalhost()) ? 'http://localhost:3000/api/save' : 'http://blokdust.com/api/save';

                $.ajax(<JQueryAjaxSettings>{
                    url: url,
                    type: 'POST',
                    crossDomain: true,
                    dataType: 'json',
                    contentType: 'application/json',
                    data: data
                }).done(function(saved){
                    resolve(saved);
                }).fail((jqXHR, textStatus: string) => {
                    reject(textStatus);
                });
            });
        });
    }

    Dispose(): void {

    }
}

export class PostData {
    constructor(public Id: string, public Data: string, public SessionId) {

    }
}
