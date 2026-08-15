const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export const PortalSetupPlaceholder = () => {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center px-4">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-6xl leading-none">🌤️</p>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
          Hello Rafiki, {getGreeting()}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Welcome back to your workspace. Let's manage the workspace operations today.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          You are in the process of setting up the portal. Please check back later.
        </p>
      </div>
    </div>
  );
};
