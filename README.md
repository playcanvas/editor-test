# Editor Testing Suite

## How to run tests

1. Run `npm run login` to open up browser window and sign in.

2. Run `npm run projects` to fetch and cache the list of projects you would like to test

3. Run `npm test` to begin the testing suite.

## Changing hosts

Edit when running `npm start` or `npm test` use the env variable `PC_HOST` to change host.

## Using custom frontend & engine

Edit when running `npm test` use the env variable `PC_FRONTEND` to set `use_local_frontend`.
Edit when running `npm test` use the env variable `PC_ENGINE` to set `use_local_engine`.

## Adding more tests

Add the project entries in in `test/fixtures/projects.mjs`. The type of each entry is is:
```js
type Project = {
    name: string // project name
    id: number // project id
    scenes: string[] // list of scene ids
}
```