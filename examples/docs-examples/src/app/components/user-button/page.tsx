'use client';
import { UserButton } from '@opendex/stack';

export default function Page() {
  return (
    <div style={{ marginLeft: '30px' }}>
      <h1>User Button</h1>
      <UserButton
        colorModeToggle={() => { console.log("color mode toggle clicked"); }}
      />
    </div>
  );
}
