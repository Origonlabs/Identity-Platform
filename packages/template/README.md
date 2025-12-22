# Atlas Identity Platform: Commercial Auth0 alternative

## [📘 Docs](https://docs.opendex.com) | [☁️ Hosted Version](https://dashboard.opendex.com/) | [✨ Demo](https://demo.opendex.com/) | [✉️ Support](mailto:support@opendex.com)

Atlas Identity Platform is a managed user authentication solution by Opendex, Inc. It is developer-friendly and available under a proprietary commercial license.

Atlas Identity Platform gets you started in just five minutes, after which you'll be ready to use all of its features as you grow your project. Our managed service is optional, and self-hosting is available under a commercial license.

We support Next.js frontends, along with any backend that can use our [REST API](https://docs.opendex.com/rest-api/overview). Check out our [setup guide](https://docs.opendex.com/getting-started/setup) to get started.

## 📦 Installation & Setup

1. Run Atlas Identity Platform's installation wizard with the following command:
    ```bash
    npx @opendex/init-stack@latest
    ```
2. Then, create an account on the dashboard (https://dashboard.opendex.com/projects), create a new project with an API key, and copy its environment variables into the .env.local file of your Next.js project:
    ```
    NEXT_PUBLIC_ATLAS_PROJECT_ID=<your-project-id>
    NEXT_PUBLIC_ATLAS_PUBLISHABLE_CLIENT_KEY=<your-publishable-client-key>
    ATLAS_SECRET_SERVER_KEY=<your-secret-server-key>
    ```
3. That's it! You can run your app with `npm run dev` and go to [http://localhost:3000/handler/signup](http://localhost:3000/handler/signup) to see the sign-up page. You can also check out the account settings page at [http://localhost:3000/handler/account-settings](http://localhost:3000/handler/account-settings).


Check out the [documentation](https://docs.opendex.com/getting-started/setup) for a more detailed guide.
