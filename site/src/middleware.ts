import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  // Only protect /keystatic routes
  if (!context.url.pathname.startsWith('/keystatic')) {
    return next();
  }

  const ADMIN_USER = import.meta.env.ADMIN_USER || 'admin';
  const ADMIN_PASS = import.meta.env.ADMIN_PASS;

  // If no password is set, allow access (dev convenience)
  if (!ADMIN_PASS) {
    return next();
  }

  const auth = context.request.headers.get('authorization');

  if (auth) {
    const [scheme, encoded] = auth.split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = atob(encoded);
      const [user, pass] = decoded.split(':');
      if (user === ADMIN_USER && pass === ADMIN_PASS) {
        return next();
      }
    }
  }

  return new Response('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Circular Design Admin"',
    },
  });
});
