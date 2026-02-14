import * as React from "react";

const VisuallyHidden = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ children, ...props }, ref) => (
  <span
    ref={ref}
    className="sr-only"
    {...props}
  >
    {children}
  </span>
));
VisuallyHidden.displayName = "VisuallyHidden";

export { VisuallyHidden };
