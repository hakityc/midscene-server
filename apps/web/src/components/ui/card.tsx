import * as React from 'react';

import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, collapsible, defaultCollapsed = false, ...props }, ref) => {
    const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

    return (
      <CardContext.Provider
        value={{ collapsible, isCollapsed, setIsCollapsed }}
      >
        <div
          ref={ref}
          className={cn(
            'border bg-card text-card-foreground shadow',
            className,
          )}
          {...props}
        />
      </CardContext.Provider>
    );
  },
);
Card.displayName = 'Card';

interface CardContextValue {
  collapsible?: boolean;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const CardContext = React.createContext<CardContextValue>({
  collapsible: false,
  isCollapsed: false,
  setIsCollapsed: () => {},
});

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { collapsible, isCollapsed, setIsCollapsed } =
    React.useContext(CardContext);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">{children}</div>
        {collapsible && (
          <button
            type="button"
            onClick={toggleCollapse}
            className="flex-shrink-0 p-1 hover:bg-accent rounded-sm transition-colors"
            aria-label={isCollapsed ? '展开' : '收起'}
          >
            <svg
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                isCollapsed ? '-rotate-90' : 'rotate-0',
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
});
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { collapsible, isCollapsed } = React.useContext(CardContext);

  if (collapsible && isCollapsed) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn(
        'p-6 pt-0 transition-all duration-200',
        collapsible && 'animate-in fade-in',
        className,
      )}
      {...props}
    />
  );
});
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { collapsible, isCollapsed } = React.useContext(CardContext);

  if (collapsible && isCollapsed) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center p-6 pt-0 transition-all duration-200',
        collapsible && 'animate-in fade-in',
        className,
      )}
      {...props}
    />
  );
});
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
