module Fayde.Controls.viewbox.helpers {
    export function computeScaleFactor (availableSize: minerva.ISize, contentSize: minerva.ISize, stretch: Media.Stretch, stretchDirection: StretchDirection) {
        var scaleX = 1.0;
        var scaleY = 1.0;

        var isConstrainedWidth = isFinite(availableSize.width);
        var isConstrainedHeight = isFinite(availableSize.height);

        if ((stretch === Media.Stretch.Uniform || stretch === Media.Stretch.UniformToFill || stretch === Media.Stretch.Fill)
            && (isConstrainedWidth || isConstrainedHeight)) {
            scaleX = isZero(contentSize.width) ? 0.0 : availableSize.width / contentSize.width;
            scaleY = isZero(contentSize.height) ? 0.0 : availableSize.height / contentSize.height;

            if (!isConstrainedWidth)        scaleX = scaleY;
            else if (!isConstrainedHeight)  scaleY = scaleX;
            else {
                switch (stretch) {
                    case Media.Stretch.Uniform:
                        var minscale = scaleX < scaleY ? scaleX : scaleY;
                        scaleX = scaleY = minscale;
                        break;
                    case Media.Stretch.UniformToFill:
                        var maxscale = scaleX > scaleY ? scaleX : scaleY;
                        scaleX = scaleY = maxscale;
                        break;
                    case Media.Stretch.Fill:
                        break;
                }
            }

            //Apply stretch direction by bounding scales.
            //In the uniform case, scaleX=scaleY, so this sort of clamping will maintain aspect ratio
            //In the uniform fill case, we have the same result too.
            //In the fill case, note that we change aspect ratio, but that is okay
            switch (stretchDirection) {
                case StretchDirection.UpOnly:
                    if (scaleX < 1.0) scaleX = 1.0;
                    if (scaleY < 1.0) scaleY = 1.0;
                    break;

                case StretchDirection.DownOnly:
                    if (scaleX > 1.0) scaleX = 1.0;
                    if (scaleY > 1.0) scaleY = 1.0;
                    break;

                case StretchDirection.Both:
                    break;

                default:
                    break;
            }
        }

        return new Size(scaleX, scaleY);
    }

    var epsilon: number = 1.192093E-07;
    function isZero (val: number): boolean {
        return Math.abs(val) < epsilon;
    }
}