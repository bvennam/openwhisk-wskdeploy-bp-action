# OpenWhisk Wskdeploy Blueprint Action
OpenWhisk action that uses git and wskdeploy to clone a Blueprint then deploy it on OpenWhisk

## Instructions
1. Clone repo
2. Make sure you have Docker and Dockerhub set-up
3. Create a Dockerfile (or use the one provided) that has the same syntax as the one in this repo, and then build it by running the following commands:

```
docker build . -t <YOUR DOCKERHUB USERNAME>/nodejs6action-git
docker push <YOUR DOCKERHUB USERNAME>/nodejs6action-git
```

### Automatic deploy
1. Run `./deploy.sh` either using the defaults (look inside `deploy.sh`), and if you need custom naming you can input them as arguments, like below:

```
./deploy.sh <OW_ACTION_NAME> <ACTION_ZIP> <OW_ACTION_DOCKER_IMAGE> <OW_HOST> <OW_AUTH>
```

### Manual deploy

1. Zip up the `deploy.js`, `package.json`, and `wskdeploy` files with:

```
cd action
zip -r ../action.zip *
```

2. Deploy it to OpenWhisk by running:

```
bx wsk action update clone-and-wskdeploy action.zip --docker <YOUR DOCKERHUB USERNAME>/nodejs6action-git
```

### Invoking the action
1. Invoke it with the following syntax

```
bx wsk action invoke clone-and-wskdeploy -p repo <URL> [-p manifestPath <PATH TO MANIFEST FILE> -p wskAuth <WSK AUTH KEY>] [-p wskApiHost <WSK API HOST>] [-p envData <JSON>] -r
```

* Note: the `-r` flag tells OpenWhisk to wait and return the response in the CLI
* Note: `[]` denotes an optional parameter
* Note: `repo` param should have the structure:
```
github.com/blueprints/my-awesome-blueprint
```
* Note: `envData` param should have the structure:
```
'{"CLOUDANT_HOSTNAME":"MY_CLOUDANT_HOSTNAME","CLOUDANT_DB":"MY_CLOUDANT_DB"}'
```
