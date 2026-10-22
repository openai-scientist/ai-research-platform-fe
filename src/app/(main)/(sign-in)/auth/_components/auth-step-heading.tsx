export function AuthStepHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-2 text-center">
      <h1 className="text-balance font-medium text-3xl">{title}</h1>
      <p className="wrap-anywhere text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
