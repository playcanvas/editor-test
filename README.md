<img width="200" src="https://s3-eu-west-1.amazonaws.com/static.playcanvas.com/platform/images/logo/playcanvas-logo-medium.png"/>

# PlayCanvas Editor Testing Suite

## How to run tests

### Locally

1. Create a `.env` file with the following information: 

```
PC_HOST=playcanvas.com
PC_LOGIN_HOST=login.playcanvas.com
PC_LAUNCH_HOST=launch.playcanvas.com
PC_GMAIL=<gmail-email>
PC_PASSWORD=<password>
```

2. Run `npm test` to begin the testing suite.

### Containerized

1. Create an `.env.dev` file as per above
2. Run `npm run docker` to compose the docker build and run