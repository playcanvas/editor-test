<img width="200" src="https://s3-eu-west-1.amazonaws.com/static.playcanvas.com/platform/images/logo/playcanvas-logo-medium.png"/>

# PlayCanvas Editor Testing Suite

This is the official testing suite for the PlayCanvas Editor. Tests are split into two categories:

- `test/api` - tests for the Editor API behavior
- `test/ui` - tests for the Editor UI behavior

## How to run tests

### Locally

1. Create a `.env` file with the following information: 

```
PC_HOST=playcanvas.com
PC_LOGIN_HOST=login.playcanvas.com
PC_LAUNCH_HOST=launch.playcanvas.com
PC_EMAIL=<playcanvas-email>
PC_PASSWORD=<playcanvas-password>
```

2. Run `npm test` to begin the testing suite.

### Containerized

1. Create an `.env.dev` file as per above
2. Run `npm run docker` to compose the docker build and run