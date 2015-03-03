import App = require("../../App");
import IOperation = require("./IOperation");
import IBlock = require("../../Blocks/IBlock");

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
                var blocks: IBlock[] = App.Deserialize(data);
                App.Blocks.Clear();
                App.Blocks.AddRange(blocks);
                resolve(data);
            });

        });
    }

}

export = LoadOperation;