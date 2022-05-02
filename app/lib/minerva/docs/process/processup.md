## ProcessUp
    * Bounds
        * Compute Bounds
            * Coerce actual size
            * Utilize to compute extents unioning with children GBWC (if totalrendervisible)
            * Include effect padding and local projection to compute GBWC
            * Include effect padding and absolute projection to compute SBWC
        * If GBWC changes
            * Update Bounds (visual parent)
            * Invalidate visual parent with old SBWC
            * Invalidate visual parent with new SBWC
        * If EWC changes
            * Invalidate SBWC
    * NewBounds
        * Invalidate visual parent with SBWC
        * If no visual parent, invalidate on surface
    * Invalidate
        * Invalidate visual parent or surface with dirty region
        * Clear dirty region