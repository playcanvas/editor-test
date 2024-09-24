# Editor Testing Suite

## How to run tests

1. Create a `.env` file with the following information: 

```
PC_GMAIL=<gmail-email>
PC_PASSWORD=<password>
PC_USERNAME=<playcanvas-username>
PC_HOST=playcanvas.com
PC_LAUNCH_HOST=launch.playcanvas.com
```

1. Run `npm run login` to open up the browser to auto-sign-in (N.B. This will automatically fetch all projects and store them in `cache/projects.json`)

3. Run `npm test` to begin the testing suite.

## Changing hosts

Edit when running `npm start` or `npm test` use the env variables `PC_HOST` and `PC_LAUNCH_HOST` to change host.

## Using custom frontend & engine

Edit when running `npm test` use the env variable `PC_FRONTEND` to set `use_local_frontend`.
Edit when running `npm test` use the env variable `PC_ENGINE` to set `use_local_engine`.

## Adding more tests

Add the testing account to the project team with **both** READ and WRITE access then rerun `npm run projects` to update the cache.