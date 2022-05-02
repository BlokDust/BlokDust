module Utils {
    export class Clipboard {
        public static copy(text: string) {
            var $tempDiv = $("<div style='position:absolute;left:-9999px'>");
            var brRegex = /<br\s*[\/]?>/gi;            
            text = text.replace(brRegex, "\n");
            $("body").append($tempDiv);
            $tempDiv.append(text);
            var $tempInput = $("<textarea>");
            $tempDiv.append($tempInput);
            $tempInput.val($tempDiv.text()).select();
            document.execCommand("copy");
            $tempDiv.remove();
        }
        
        public static supportsCopy(): boolean {
            return document.queryCommandSupported && document.queryCommandSupported('copy');
        }
        
    }

}