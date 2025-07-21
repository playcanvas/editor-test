<div align="center">

<img width="200" src="https://s3-eu-west-1.amazonaws.com/static.playcanvas.com/platform/images/logo/playcanvas-logo-medium.png"/>

# PlayCanvas Editor Testing Suite

[User Manual](https://developer.playcanvas.com) | [Forum](https://forum.playcanvas.com)

This is the official testing suite for the [PlayCanvas Editor](https://playcanvas.com)

[![Average time to resolve an issue][resolution-badge]][isitmaintained-url]
[![Percentage of issues still open][open-issues-badge]][isitmaintained-url]
[![Twitter][twitter-badge]][twitter-url]

![Playwright](https://raw.githubusercontent.com/playcanvas/editor-test/refs/heads/screenshot/images/playwright.png)

</div>

## Tests

Tests are split into two categories:

- `test/api` - tests for the Editor API behavior
- `test/ui` - tests for the Editor UI behavior

## Usage

To run the test suite ensure you have [Docker](https://www.docker.com/) installed. Follow these steps:

1. Create a `.env` file based on the [template](https://github.com/playcanvas/editor-test/blob/docs/.env.template)

    ```env
    PC_HOST=playcanvas.com
    PC_LOGIN_HOST=login.playcanvas.com
    PC_LAUNCH_HOST=launch.playcanvas.com
    PC_EMAIL=<playcanvas-email>
    PC_PASSWORD=<playcanvas-password>
    PC_LOCAL_FRONTEND=<true|false>
    ```

> [!IMPORTANT]
> The account used must be an existing account. Create one [here](https://login.playcanvas.com)

2. Run the container with Docker compose

    ```sh
    docker compose up
    ```

3. Stop the container with Docker compose

    ```sh
    docker compose down --remove-orphans
    ```

> [!NOTE]
> To build the image from source instead of pulling from the registry append the `--build` flag

## Local Development

To create new tests, ensure you have [Node.js](https://nodejs.org/) 18 or later installed. Follow these steps:

1. Clone the repository:

   ```sh
   git clone https://github.com/playcanvas/editor-test.git
   cd editor-test
   ```

2. Install dependencies:

   ```sh
   npx playwright install --with-deps
   npm install
   ```

3. Create tests and put them into the respective folders. For dynamic recording of tests run this command:

    ```sh
    npm run codegen
    ```

> [!NOTE]
> Run `npm run` for the full list of npm scripts

## Library integration testing

The testing suite is built on the following open source libraries:

| Library                                                       | Details                                     |
| ------------------------------------------------------------- | ------------------------------------------- |
| [PlayCanvas Engine](https://github.com/playcanvas/engine)     | Powers the Editor's 3D View and Launch Page |
| [Observer](https://github.com/playcanvas/playcanvas-observer) | Data binding and history                    |
| [Editor API](https://github.com/playcanvas/editor-api)        | Public API for Editor automation            |

To test the integration of these libraries use [npm link](https://docs.npmjs.com/cli/v9/commands/npm-link). Follow these steps:

1. Create a global link from source

    ```sh
    cd <library>
    npm run link
    ```

2. Create a link to the global link

    ```sh
    cd editor-test
    npm run link <library>
    ```

[resolution-badge]: https://isitmaintained.com/badge/resolution/playcanvas/editor-test.svg
[open-issues-badge]: https://isitmaintained.com/badge/open/playcanvas/editor-test.svg
[isitmaintained-url]: https://isitmaintained.com/project/playcanvas/editor-test
[twitter-badge]: https://img.shields.io/twitter/follow/playcanvas.svg?style=social&label=Follow
[twitter-url]: https://twitter.com/intent/follow?screen_name=playcanvas