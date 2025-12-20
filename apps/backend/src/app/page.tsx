import Link from "next/link";

export default function Home() {
  return (
    <div>
      Welcome to Atlas Identity Platform&apos;s API endpoint.<br />
      <br />
      Were you looking for <Link href="https://dashboard.opendex.com">the dashboard</Link> instead?<br />
      <br />
      You can also return to <Link href="https://opendex.com">https://opendex.com</Link>.<br />
      <br />
      <Link href="/api/v1">API v1</Link><br />
    </div>
  );
}
