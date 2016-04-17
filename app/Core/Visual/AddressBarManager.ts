
export class AddressBarManager  {

    public DefaultTitle: string;

    constructor() {
        this.DefaultTitle = "BlokDust";
    }

    //-------------------------------------------------------------------------------------------
    //  ADD NEW COMPOSITION URL
    //-------------------------------------------------------------------------------------------

    UpdateURL(url: string) {

        // split URL at query point if it exists //
        /*var currentUrl = window.location.href;
        var newUrl = "";
        var splitUrl = currentUrl.split('?');
        if (splitUrl.length>1) {
            newUrl = ""+splitUrl[0];
        }

        // add the comp url //
        newUrl = newUrl + "";*/

        window.history.pushState({html: "Reset"}, this.DefaultTitle, ""+url);

        document.title = this.DefaultTitle;


    }

    //-------------------------------------------------------------------------------------------
    //  STRIP COMPOSITION URL
    //-------------------------------------------------------------------------------------------

    StripURL() {

        // split URL at query point //
        var currentUrl = window.location.href;
        var splitUrl = currentUrl.split('?');
        if (splitUrl.length>1) {
            window.history.pushState({html: "Reset"}, this.DefaultTitle, ""+splitUrl[0]);
            window.onpopstate = function(){
                window.location.reload();
            }
        }

        document.title = this.DefaultTitle;
    }


}
