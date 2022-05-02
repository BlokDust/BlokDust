module Fayde.Media.Imaging {
    export function encodeImage (buffer: ArrayBuffer): Uri {
        var bytes = new Uint8Array(buffer);
        var data = convertToBase64(bytes);
        var type = getImageType(bytes);
        return new Uri(`data:${type};base64,${data}`);
    }

    function getImageType (bytes: Uint8Array) {
        if (isJpg(bytes))
            return "image/jpeg";
        if (isPng(bytes))
            return "image/png";
        return "image/jpeg";
    }

    function convertToBase64 (bytes: Uint8Array) {
        var arr = [];
        for (var i = 0; i < bytes.byteLength; i++) {
            arr.push(String.fromCharCode(bytes[i]));
        }
        return window.btoa(arr.join(''));
    }

    function isJpg (bytes: Uint8Array): boolean {
        return bytes[0] === 0xFF
            && bytes[1] === 0xD8
            && bytes[bytes.length - 2] === 0xFF
            && bytes[bytes.length - 1] === 0xD9;
    }

    function isPng (bytes: Uint8Array): boolean {
        return bytes[0] === 0x89
            && bytes[1] === 0x50
            && bytes[2] === 0x4E
            && bytes[3] === 0x47
            && bytes[4] === 0x0D
            && bytes[5] === 0x0A
            && bytes[6] === 0x1A
            && bytes[7] === 0x0A;
    }
}