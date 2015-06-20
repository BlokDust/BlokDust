import IOperation = require("../Core/Operations/IOperation");

class SaveOperation<String> implements IOperation
{
    private _JSON: any;

    constructor(json: string, id?: string) {

        // compress the json
        //var lzma = new LZMA(json);

        this._JSON = {
            "Id": (id) ? id : "",
            "Data": json
        };
    }

    Do(): Promise<String> {
        var that = this;

        return new Promise((resolve) => {

            $.ajax(<JQueryAjaxSettings>{
                url: "http://blokdust.azurewebsites.net/api/anonymousblobs",
                type: 'POST',
                crossDomain: true,
                dataType: 'json',
                contentType: 'application/json',
                data: JSON.stringify(that._JSON)
            }).done(function(data){
                resolve(data);
            });

        });
    }

    Dispose(): void {

    }
}

export = SaveOperation;