<div align="center">

<img width="200" src="https://s3-eu-west-1.amazonaws.com/static.playcanvas.com/platform/images/logo/playcanvas-logo-medium.png"/>

# PlayCanvas Editor Testing Suite

[User Manual](https://developer.playcanvas.com) | [Forum](https://forum.playcanvas.com)

This is the official testing suite for the [PlayCanvas Editor](https://playcanvas.com)

[![Average time to resolve an issue][resolution-badge]][isitmaintained-url]
[![Percentage of issues still open][open-issues-badge]][isitmaintained-url]
[![Twitter][twitter-badge]][twitter-url]

</div>

## Tests

Tests are split into two categories:

- `test/api` - tests for the Editor API behavior
- `test/ui` - tests for the Editor UI behavior

## Usage

### Local

1. Create a `.env` file with the following information: 

```
PC_HOST=playcanvas.com
PC_LOGIN_HOST=login.playcanvas.com
PC_LAUNCH_HOST=launch.playcanvas.com
PC_EMAIL=<playcanvas-email>
PC_PASSWORD=<playcanvas-password>
```

2. Run `npm test` to begin the testing suite.

### Docker

1. Create an `.env.dev` file as per above
2. Run `npm run docker` to compose the docker build and run

[resolution-badge]: https://isitmaintained.com/badge/resolution/playcanvas/editor-test.svg
[open-issues-badge]: https://isitmaintained.com/badge/open/playcanvas/editor-test.svg
[isitmaintained-url]: https://isitmaintained.com/project/playcanvas/editor-test
[twitter-badge]: https://img.shields.io/twitter/follow/playcanvas.svg?style=social&label=Follow
[twitter-url]: https://twitter.com/intent/follow?screen_name=playcanvas