import * as React from "react"
// Lightweight local Slot replacement (avoids adding @radix-ui/react-slot runtime dependency)
const Slot = ({ children, ...props }: any) => {
  // If children is a single React element, clone it to apply props
  const child = Array.isArray(children) ? children[0] : children;
  if (React.isValidElement(child)) {
    return React.cloneElement(child, props as any);
  }
  return <>{children}</>;
};
type VariantProps<T> = {
  variant?: T extends { variants: infer V } ? keyof V : string;
  size?: string;
};

// Minimal variant function to replace cva for this project
function simpleCva(base: string, config: any) {
  return (opts: any = {}) => {
    const variant = opts.variant || config?.defaultVariants?.variant;
    const size = opts.size || config?.defaultVariants?.size;
    let classes = base;
    if (config?.variants?.variant && variant && config.variants.variant[variant]) {
      classes += ' ' + config.variants.variant[variant];
    }
    if (config?.variants?.size && size && config.variants.size[size]) {
      classes += ' ' + config.variants.size[size];
    }
    if (opts.className) classes += ' ' + opts.className;
    return classes;
  };
}
import { cn } from "@/lib/utils"

const buttonVariants = simpleCva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
