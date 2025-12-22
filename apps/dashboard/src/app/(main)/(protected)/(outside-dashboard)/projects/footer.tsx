import { Link } from "@/components/link";
import { Github, Link2, Mail, Separator, Typography } from "@opendex/stack-ui";

export default function Footer () {
  return (
    <footer>
      <Separator />

      <div className="flex flex-col md:flex-row p-4 gap-4 backdrop-blur-md bg-slate-200/20 dark:bg-black/20">
        <div className="flex flex-col gap-4 md:flex-1">
          <ul className="flex gap-4 flex-grow">
            {[
              { href: "mailto:support@opendex.com", icon: Mail },
              { href: "https://www.linkedin.com/company/opendex-inc", icon: Link2 },
              { href: "https://github.com/opendex/atlas-identity-platform", icon: Github },
            ].map(({ href, icon: Icon }) => (
              <li key={href}>
                <Link href={href}>
                  <Icon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-4 md:flex-1 md:justify-end flex-wrap">
          {[
            { href: "https://opendex.com", label: "Home" },
            { href: "https://www.iubenda.com/privacy-policy/19290387", label: "Privacy policy" },
            { href: "https://www.iubenda.com/privacy-policy/19290387/cookie-policy", label: "Cookie policy" },
            { href: "https://www.iubenda.com/terms-and-conditions/19290387", label: "Terms & conditions" },
          ].map(({ href, label }) => (
            <Link key={label} href={href}>
              <Typography variant="secondary" type='label'>{label}</Typography>
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
