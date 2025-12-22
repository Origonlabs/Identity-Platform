import { SignIn } from '@opendex/stack';

export default function Page() {
  return (
    <div>
      <h1>Sign In</h1>
      <SignIn
        fullPage={true}
      />
    </div>
  );
}
