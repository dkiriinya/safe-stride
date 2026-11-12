import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/profile(.*)',
  '/api/protected(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Only run middleware on protected routes to prevent unnecessary dev-mode handshake redirects on public pages
    '/dashboard(.*)',
    '/profile(.*)',
    '/api/protected(.*)',
  ],
};
