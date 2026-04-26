This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Storybook

Storybook lets you develop and review UI components in isolation.

```bash
npm run storybook
```

Opens at [http://localhost:6006](http://localhost:6006).

### Adding or updating stories

Stories live next to their component: `app/components/Foo.stories.tsx`.

A minimal story looks like this:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Foo } from "./Foo";

const meta: Meta<typeof Foo> = {
  title: "Components/Foo",
  component: Foo,
  tags: ["autodocs"],
};
export default meta;

export const Default: StoryObj<typeof Foo> = {
  args: { label: "Hello" },
};
```

Cover the states that matter: default, loading, empty, error, and any edge cases like long content. Keep stories focused — one state per export.
