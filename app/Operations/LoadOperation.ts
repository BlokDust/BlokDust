import IOperation = require("../Core/Operations/IOperation");
import IBlock = require("../Blocks/IBlock");

class LoadOperation<String> implements IOperation
{
    private _Id: any;
    private _LZMA: any;

    constructor(id: string) {
        this._Id = id;
        this._LZMA = new LZMA("/lib/lzma/src/lzma_worker.js");
    }

    Decompress(data: string): Promise<string>{

        return new Promise<string>((resolve) => {

            data = JSON.parse("[" + data + "]");

            this._LZMA.decompress(data,
                function(result) {
                    resolve(result.toString());
                },
                function(percent) {
                    //console.log(percent);
                }
            );
        });
    }

    Do(): Promise<string> {
        var that = this;

        return new Promise<string>((resolve) => {

            $.ajax(<JQueryAjaxSettings>{
                url: "http://blokdust.azurewebsites.net/api/anonymousblobs/" + this._Id,
                type: 'GET',
                crossDomain: true,
                dataType: 'json',
                contentType: 'application/json'
            }).done((data) => {
                that.Decompress(data).then((decompressed) => {
                    resolve(decompressed);
                });
            });
        });
    }

    Dispose(): void {

    }
}

export = LoadOperation;