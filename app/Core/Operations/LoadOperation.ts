import IOperation = require("./IOperation");

class LoadOperation<String> implements IOperation
{
    private _Id: any;

    constructor(id: string) {
        this._Id = id;
    }

    Do(): Promise<String> {
        var that = this;

        return new Promise((resolve) => {

            $.ajax(<JQueryAjaxSettings>{
                url: "http://blobdust.azurewebsites.net/api/anonymousblobs/" + this._Id,
                type: 'GET',
                crossDomain: true,
                dataType: 'json',
                contentType: 'application/json'
            }).done(function(data){
                console.log(data);
                resolve();
            });

        });
    }

}

export = LoadOperation;