import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/register", label: "Register" },
] as const;

export function Nav() {
  return (
    <nav className="border-b hairline px-6 py-3">
      <div className="mx-auto flex max-w-6xl items-center gap-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Shosetu Reader
        </Link>
        <div className="flex items-center gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
