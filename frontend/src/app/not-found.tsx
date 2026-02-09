import Link from 'next/link';

export const viewport = {
  width: 'device-width' as const,
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
      <p className="text-gray-600 mb-6">Could not find the requested resource.</p>
      <Link
        href="/"
        className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-lg font-semibold hover:bg-primary/80 transition-colors"
      >
        Return home
      </Link>
    </div>
  );
}
