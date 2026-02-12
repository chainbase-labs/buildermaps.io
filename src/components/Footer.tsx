interface FooterProps {
  lastEdited?: string;
}

export function Footer({
  lastEdited = "November 10, 2025, at 14:30 (UTC)",
}: FooterProps) {
  return (
    <footer className="mt-16 border-t bg-white py-8">
      <div className="container mx-auto max-w-5xl px-6">
        <div className="mb-3 text-sm text-gray-500">
          This page was last edited on {lastEdited}.
        </div>
        <div className="mb-3 text-sm text-gray-600">
          Content is available under{" "}
          <a
            href="https://opensource.org/licenses/MIT"
            className="text-blue-600 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            MIT License
          </a>{" "}
          unless otherwise noted. BuilderMaps.io is a community-driven public
          goods project.
        </div>
        <div className="mb-6 text-sm text-gray-500">
          Powered by{" "}
          <a
            href="https://chainbase.com"
            className="text-blue-600 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Chainbase
          </a>{" "}
          and Community.
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <a href="#" className="text-blue-600 hover:underline">
            Privacy policy
          </a>
          <a href="#" className="text-blue-600 hover:underline">
            About BuilderMaps.io
          </a>
          <a href="#" className="text-blue-600 hover:underline">
            Disclaimers
          </a>
          <a href="#" className="text-blue-600 hover:underline">
            Grant us
          </a>
          <a href="#" className="text-blue-600 hover:underline">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
