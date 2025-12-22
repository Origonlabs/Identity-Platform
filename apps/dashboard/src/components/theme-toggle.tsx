import { Button } from "@opendex/stack-ui";
import { MoonIcon, SunIcon } from "@opendex/stack-ui";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="outline"
      size="icon"
      className="w-8 h-8"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <SunIcon className="hidden dark:block w-4 h-4" />
      <MoonIcon className="block dark:hidden w-4 h-4" />
    </Button>
  );
}
