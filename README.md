# Action Server

> Why all the fuss?

## Overview

Instead of using `HTTP` headers and all the mumbo jumbo that goes along with a normal network request, this is an example of using strings and `net` server to send messages between instances.

## Demo

```
$ git clone git@github.com:beardedtim/action-server.git

$ cd action-server

$ node index.js
```

In a different terminal

```
$ cd action-server

$ node worker.js
```

And yet another one:
```
$ cd action-server

$ node worker.js
```

You should get prints in both worker consoles.