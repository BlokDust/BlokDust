module Utils {

    export class Files {
        static simplifyMimeType(mime: string) {
            switch (mime) {
                case 'text/plain':
                    return 'txt';
                case 'image/jpeg':
                    return 'jpg';
                case 'application/msword':
                    return 'doc';
                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                    return 'docx';
                default:
                    var parts = mime.split('/');
                    return parts[parts.length - 1];
            }
        }
    }
}