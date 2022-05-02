module Fayde.Utils {
    class Color {
        public static Float32ColorToARGB(float32Color:number):number[] {
            var a:number = ( float32Color & 0xff000000 ) >>> 24
            var r:number = ( float32Color & 0xff0000 ) >>> 16;
            var g:number = ( float32Color & 0xff00 ) >>> 8;
            var b:number = float32Color & 0xff;
            var result:number[] = [ a, r , g , b ];

            return result;
        }

        private static ComponentToHex(c:number):string {
            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }

        public static RGBToHexString(rgb:number[]):string {
            Color.Coalesce(rgb);
            return "#" + Color.ComponentToHex(rgb[0]) + Color.ComponentToHex(rgb[1]) + Color.ComponentToHex(rgb[2]);
        }

        public static ARGBToHexString(argb:number[]):string {
            return "#" + Color.ComponentToHex(argb[0]) + Color.ComponentToHex(argb[1]) + Color.ComponentToHex(argb[2]) + Color.ComponentToHex(argb[3]);
        }

        public static Coalesce(arr:any[]):void {
            for (var i = 1; i < arr.length; i++) {
                if (typeof(arr[i]) === 'undefined') arr[i] = arr[i - 1];
            }
        }
    }
}