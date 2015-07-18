import IOperation = require("../Core/Operations/IOperation");

class SaveOperation<String> implements IOperation
{
    private _JSON: any;
    private _LZMA: any;

    constructor(json: string, compositionId?: string, sessionId?: string) {

        this._JSON = new PostData(
            (compositionId) ? compositionId : "",
            json,
            sessionId
        );

        this._LZMA = new LZMA("/lib/lzma/src/lzma_worker.js");
    }

    Compress(data: string): Promise<string>{

        return new Promise((resolve) => {

            this._LZMA.compress(data, 5,
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

            //console.log(data);

            that.Compress(that._JSON.Data).then((compressed) => {

                that._JSON.Data = compressed;

                var data = JSON.stringify(that._JSON);

                $.ajax(<JQueryAjaxSettings>{
                    url: "http://blokdust.azurewebsites.net/api/anonymousblobs",
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

class PostData {
    constructor(public Id: string, public Data: string, public SessionId) {

    }
}

export = SaveOperation;