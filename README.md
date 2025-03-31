<img width="200" src="https://s3-eu-west-1.amazonaws.com/static.playcanvas.com/platform/images/logo/playcanvas-logo-medium.png"/>

# PlayCanvas Editor Testing Suite

## How to run tests

1. Create a `.env` file with the following information: 

```
PC_HOST=playcanvas.com
PC_LOGIN_HOST=login.playcanvas.com
PC_LAUNCH_HOST=launch.playcanvas.com
PC_GMAIL=<gmail-email>
PC_PASSWORD=<password>
```

2. Run `npm test` to begin the testing suite.

## Changing hosts

Edit when running `npm start` or `npm test` use the env variables `PC_HOST` and `PC_LAUNCH_HOST` to change host.

## Using custom frontend & engine

Edit when running `npm test` use the env variable `PC_FRONTEND` to set `use_local_frontend`.
Edit when running `npm test` use the env variable `PC_ENGINE` to set `use_local_engine`.

## Adding more tests

Add the testing account to the project team with **both** READ and WRITE access then rerun `npm run projects` to update the cache.