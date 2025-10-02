'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ProductNavigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/products', label: '📦 All Products', match: '/products' },
    { href: '/products/recipes', label: '📝 Recipes', match: '/products/recipes' },
    { href: '/products/production', label: '🏭 Production', match: '/products/production' },
    { href: '/products/categories', label: '🏷️ Categories', match: '/products/categories' },
  ];

  const isActive = (itemPath: string) => {
    if (itemPath === '/products') {
      return pathname === '/products';
    }
    return pathname?.startsWith(itemPath);
  };

  return (
    <div className="border-t border-gray-200 mt-4">
      <nav className="flex space-x-8">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
              isActive(item.match)
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
