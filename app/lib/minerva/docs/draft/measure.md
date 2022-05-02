# Pipeline

## Tapin Order

* validate
* validateVisibility
* applyTemplate
* checkNeedMeasure
* invalidateFuture
* prepareOverride
* doOverride
    * Assign `desiredSize` based on compilation of child `desiredSize`.
* completeOverride
* finishDesired


# Legacy

## _DoMeasureWithError

* Use `PreviousConstraint` as `availableSize` to initiate start of measure traversal
* Fall back to infinite size for `availableSize` if root layout container is not attached and no `PreviousConstraint`
* [#_Measure]
* Invalidates visual parent's measure if `DesiredSize` changed
* Clear dirty flags

## _Measure

* Validate `availableSize` isn't NaN
* If `Collapsed`: set `PreviousConstraint` to `availableSize`, clear `DesiredSize`, skip out
* Memoized `ApplyTemplate`
* If does not have dirty measure flag and `PreviousConstraint` equals `null` or `availableSize`: skip out 
* Save `availableSize` to `PreviousConstraint`
* Invalidate Arrange
* Update Bounds
* Shrink available by `Margin`
* Coerce `availableSize` (`Width`, `MinWidth`, `MaxWidth`, `Height`, `MinHeight`, `MaxHeight`, `UseLayoutRounding`)
* [#`MeasureOverride`] -> `response`
* Save `response` as `HiddenDesire`
* Clear dirty flags
* If root or parent is `Canvas` and is `Canvas`: clear `DesiredSize`, skip out
* Coerce `response`
* Grow by `Margin`
* Set `response` to min of `response` and `availableSize`
* Round if `UseLayoutRounding`
* Set `DesiredSize` to `response`

## MeasureOverride

* Control-specific layout
* Falls into children [#_Measure]