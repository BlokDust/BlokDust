module Utils{
    export class Documents {
        static isInIFrame(): boolean {
            // see http://stackoverflow.com/questions/326069/how-to-identify-if-a-webpage-is-being-loaded-inside-an-iframe-or-directly-into-t
            try {
                return window.self !== window.top;
            } catch (e) {
                return true;
            }
        }

        static supportsFullscreen(): boolean {
            var doc = document.documentElement;
            var support = doc.requestFullscreen || doc.mozRequestFullScreen ||
                        doc.webkitRequestFullScreen || doc.msRequestFullscreen;
            
            return support != undefined;
        }

        static isHidden(): boolean {
            var prop = Documents.getHiddenProp();
            if (!prop) return false;

            return document[prop];
        }

        static getHiddenProp(): string{
            var prefixes = ['webkit','moz','ms','o'];

            // if 'hidden' is natively supported just return it
            if ('hidden' in document) return 'hidden';

            // otherwise loop over all the known prefixes until we find one
            for (var i = 0; i < prefixes.length; i++){
                if ((prefixes[i] + 'Hidden') in document)
                    return prefixes[i] + 'Hidden';
            }

            // otherwise it's not supported
            return null;
        }
    }
}