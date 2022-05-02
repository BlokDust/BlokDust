* Shape
    
    `Stretch` causes `invalidateNaturalBounds`. `invalidateNaturalBounds` --> `invalidateMeasure`, `updateBounds`.
    
    * Measure
        * Determine `desiredSize` by `Stretch`ing `naturalBounds` to `availableSize`
    * Arrange
        * Determine `arrangedSize` by `Stretch`ing `naturalBounds` to `finalSize`
    * Process Up
        * `extents` (`stretchBounds`)
        * `extentsWithChildren`
        * `stretchXform` 
        
* Rectangle (`Fill` by default)
    * `naturalBounds` <-- 0,0
    
* Ellipse (`Fill` by default)
    * `naturalBounds` <-- 0,0

* Line
    * `naturalBounds` <-- (X1,Y1)-(X2,Y2)
    * Measure
        * `desiredSize` <-- `Stretch` `naturalBounds` to `availableSize`

* Path

* Polygon

* Polyline


* Shape
    * Natural Bounds
        * ComputeShapeBoundsImpl(false)
    * ComputeShapeBoundsImpl(logical)
        * Ensure path
        * If empty or no path, empty rect
        * Calculate path bounds

* Ellipse
    * NaturalBounds --> 0,0

* Rectangle
    * NaturalBounds --> 0,0
    * StretchBounds --> ShapeBounds
    * ShapeBounds
        * bounds <- 0,0,actualWidth,actualHeight
        * if negative bounds or 