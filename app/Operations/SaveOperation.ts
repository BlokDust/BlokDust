import IOperation = require("../Core/Operations/IOperation");

class SaveOperation<String> implements IOperation
{
    private _JSON: any;

    constructor(json: string, id?: string) {
        this._JSON = {
            "Id": (id) ? id : "",
            "Data": json
        };
    }

    //Compress(json: string){
    //    // compress the json
    //    var lzma = new LZMA();
    //
    //    lzma.compress(json, 5,
    //        function(result) {
    //            return result;
    //        },
    //        function(percent) {
    //            console.log(percent);
    //        });
    //}

    Do(): Promise<String> {
        var that = this;

        return new Promise((resolve) => {

            var data = JSON.stringify(that._JSON);

            console.log(data);

            $.ajax(<JQueryAjaxSettings>{
                url: "http://blokdust.azurewebsites.net/api/anonymousblobs",
                type: 'POST',
                crossDomain: true,
                dataType: 'json',
                contentType: 'application/json',
                data: data
            }).done(function(data){
                resolve(data);
            });

        });
    }

    Dispose(): void {

    }
}

export = SaveOperation;