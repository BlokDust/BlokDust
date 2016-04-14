import {IOperation} from '../Core/Operations/IOperation';
import {IApp} from '../IApp';

declare var App: IApp;

export class LoadOperation<String> implements IOperation {
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

        return new Promise<string>((resolve, reject) => {

            var protocol: string = (App.IsLocalhost()) ? 'http' : 'https';
            var url: string = protocol + '://files.blokdust.io/compositions/' + this._Id + '?t=' + Utils.Dates.GetTimeStamp();

            $.ajax(<JQueryAjaxSettings>{
                url: url,
                type: 'GET',
                crossDomain: true,
                dataType: 'text'
            }).done((data) => {
                that.Decompress(data).then((decompressed) => {
                    resolve(decompressed);
                });
            }).fail((jqXHR, textStatus: string) => {
                reject(textStatus);
            });
        });
    }

    Dispose(): void {

    }
}