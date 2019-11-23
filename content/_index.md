---
---

**Purple** is a simple yet powerful data backend with support for:

* Key/value operations
* Counters and sets
* Flags (basically key/value pairs where the value is a Boolean)
* Caching (with TTL)

Purple is meant to abstract away complex and multifarious data interfaces in favor of a unified set of [simple operations](#operations). Do your services and functions need access to centralized state but not to a full-fledged database like PostgreSQL or DynamoDB or FaunaDB? Purple might just be the thing for you.

## How it works

The diagram below shows how you can use Purple DB:

{{< figure src="/img/purpledb-diagram.png" width="70%" >}}

Here you see two services connecting to Purple and three serverless/FaaS functions. All of these processes can utilizing Purple as a single, centralized state storage system.

## Table of contents

* [Installation](#installation)
  * [gRPC server](#grpc-server)
  * [HTTP server](#http-server)
  * [gRPC Go client](#grpc-go-client)
  * [HTTP Go client](#http-go-client)
* [Use cases](#use-cases)
* [Interfaces](#interfaces)
  * [Clients](#clients)
* [Backends](#backends)
  * [Combinations](#combinations)
* [Operations](#operations)
* [The project](#the-project)
  * [Goals](#goals)
  * [Future directions](#future-directions)
* [Deployment](#deployment)

## Installation

Good news! There are several easy ways to run Purple.

### gRPC server

To install the Purple gRPC server:

```bash
# Executable
go get github.com/purpledb/purple/cmd/purple-grpc

# Docker image
docker pull purpledb/purple-grpc:latest
```

Then you can run it:

```bash
# Executable
purple-grpc

# Docker image
docker run --rm -it -p 8081:8081 purpledb/purple-grpc:latest
```

You should see log output like this:

```log
2019/07/27 14:37:09 Starting up the server on port 8081
```

### HTTP server

To install the purple HTTP server:

```bash
# Executable
go get github.com/purpledb/purple/cmd/purple-http

# Docker image
docker pull purpledb/purple-http:latest
```

Then you can run it:

```bash
# Executable
purple-http

# Docker image
docker run --rm -it -p 8080:8080 purpledb/purple-http:latest
```

### gRPC Go client

To use the Go client in your service or FaaS function:

```bash
go get github.com/purpledb/purple
```

To instantiate a client:

```go
import "github.com/purpledb/purple"

// Supply the address of the purple gRPC server
client, err := purple.NewGrpcClient("localhost:8081")
if err != nil { 
    // Handle error
}

// Now you can run the various data operations, for example:
if err := client.CacheSet("player1-session", "a1b2c3d4e5f6", 120); err != nil {
    // Handle error
}
```

### HTTP Go client

```go
import "github.com/purpledb/purple"

client, err := purple.NewHttpClient("http://localhost:8080")
if err != nil {
    // Handle error
}

count, err := client.CounterIncrement("player1-points", 100)
```

## Use cases

Purple is designed for situations where you need a single storage backend shared by many processes—FaaS functions, microservices, etc.—with straightforward storage needs. Here are some example scenarios:

* You're hacking on a video game and want to run CRUD operations on user data (username as key and JSON as the value) and increment and decrement point total counters for each user
* You're building a continuous integration system and need a persistent feature flag backend

Purple lets you do all of the above without needing to run multiple databases. If you *really* do need to run BigTable plus Redshift plus Redis plus MongoDB or somesuch, then Purple is probably not meant for you.

### Example app

You can see a TODO application that uses Purple [here](https://github.com/purpledb/purple/blob/master/examples/app/main.go). The application is a simple REST API that uses Purple's sets interface to expose CRUD operations to users.

To run the example app:

```bash
# First, install Docker Compose (https://docs.docker.com/compose/install/)
# Then:
git clone https://github.com/purpledb/purple && cd purple
docker-compose up --build
```

Here are some example operations on the app:

```bash
export TODOS=http://localhost:3000/todos

curl -XPOST "$TODOS?todo=shopping"
curl -XPOST "$TODOS?todo=running"
curl $TODOS
# {"todos":["shopping","running"]}
curl -XDELETE "$TODOS?todo=running"
# {"todos":["shopping"]}
```



## Interfaces

You can run Purple as a [gRPC server](#grpc-server) or as an [HTTP server](#http-server) (both expose the same [operations](#operations)).

### Clients

There are currently [Go](https://golang.org) client libraries for both [gRPC](https://godoc.org/github.com/purpledb/purple#GrpcClient) and [HTTP](https://godoc.org/github.com/purpledb/purple#HttpClient), and I hope to support other languages soon.

## Backends

There are currently three backends available for Purple:

Backend | Explanation
:-------|:-----------
Disk | Data is stored persistently on disk using the [Badger](https://godoc.org/github.com/dgraph-io/badger) library. Each service (cache, KV, etc.) is stored in its own separate on-disk DB, which guarantees key isolation.
Memory | Data is stored in native Go data structures (maps, slices, etc.). This backend is blazing fast but all data is lost when the service restarts.
[Redis](https://redis.io) | The Purple server stores all data in a persistent Redis installation. Each service uses a different Redis database, which provides key isolation.

### Combinations

Since any server type can work with any backend, the following server/backend combinations are currently supported:

Server | Backend
:------|:-------
gRPC | Memory
gRPC | Disk
gRPC | Redis
HTTP | Memory
HTTP | Disk
HTTP | Redis

## Operations

The table below lists the available operations<sup><a href="#1">*</a></sup>:

Operation | Service | Semantics
:---------|:--------|:---------
`CacheGet(key string)` | Cache | Fetches the value of a key from the cache or returns a not found error if the key doesn't exist or has expired.
`CacheSet(key, value string, ttl int32)` | Cache | Sets the value associated with a key and assigns a TTL (the default is 5 seconds). Overwrites the value and TTL if the key already exists.
`CounterIncrement(key string, amount int64)` | Counter | Increments a counter by the designated amount. Returns the new value of the counter or an error.
`CounterGet(key string)` | Counter | Fetches the current value of a counter. Returns zero if the counter isn't found.
`FlagGet(key string)` | Flag | Fetches the current Boolean value of a flag. If the flag hasn't yet been set, the default value is `false`.
`FlagSet(key string, value bool)` | Flag | Sets the Boolean value of a flag.
`KVGet(key string)` | KV | Gets the value associated with a key or returns a not found error. The value is currently just a byte array payload but could be made more complex later (e.g. a payload plus a content type, metadata, etc.).
`KVPut(key string, value *Value)` | KV | Sets the value associated with a key, overwriting any existing value.
`KVDelete(key string)` | KV | Deletes the value associated with a key or returns a not found error.
`SetGet(set string)` | Set | Fetch the items currently in the specified set. Returns an empty string set (`[]string`) if the set isn't found.
`SetAdd(set, item string)` | Set | Adds an item to the specified set and returns the resulting set.
`SetRemove(set, item string)` | Set | Removes an item from the specified set and returns the resulting set. Returns an empty set isn't found or is already empty.

<a id="1"></a>

<sup><strong>*</strong> These interfaces are from the standpoint of the Purple Go clients. They will differ when support is added for clients in other languages, though the operations will be equivalent.</sup>

## The project

Purple is in its early stages. Please do *not* use Purple as a production data service just yet (though I'd like to get there!). Instead, use it as a convenience for prototyping and experimenting.

Also be aware that Purple runs as a single instance and has no clustering built in (and thus isn't highly available). If you use the Redis backend, however, you can run multiple instances of Purple that connect to a single Redis cluster.

### Goals

Microservices or FaaS functions that rely on stateful data operations can use Purple instead of needing to interact with multiple databases. This greatly simplifies the service/function development process by sharply reducing the hassle of dealing with databases (i.e. no need to install/learn/use 5 different database clients).

Does your service need something that isn't provided by Purple? [File an issue](https://github.com/purpledb/purple/issues) or [submit a PR](https://github.com/purpledb/purple/pulls) and I'll add it!

### Future directions

In the future, I imagine Purple acting as an abstraction layer over lots of different data systems, exposing a powerful interface that covers the overwhelming majority of data use cases without exposing the system internals of any of those systems. This would entail:

* Making the current data interfaces more sophisticated and capable of covering a wider range of use cases
* Adding new interfaces, such as a timeseries interface, a simple graph interface, etc.
* Providing a relational interface that supports a subset of SQL (SQLite would likely suffice for this)
* Providing optional pluggable backends behind Purple (e.g. using Redis for caching, Elasticsearch for search, etc.)
* Providing a message queue/pub-sub interface, eliminating the need for a Kafka/Pulsar/RabbitMQ/etc. client
* Expanding to deployment targets beyond Kubernetes (potentially Heroku, Zeit/Now, etc.)

## Deployment

Purple can be deployed on pretty much any platform you can imagine. I've created configs for [Kubernetes](#kubernetes) deployment but will provide other targets in the future.

### Kubernetes

There are two configuration files in the [`deploy`](https://github.com/purpledb/purple/tree/master/deploy) directory that enable you to run the purple gRPC and HTTP servers, respectively, on Kubernetes. Both use the `default` namespace and both use Redis as a backend (and install a Redis service).

#### gRPC

```bash
kubectl apply -f https://raw.githubusercontent.com/purpledb/purple/master/deploy/purple-grpc-k8s.yaml
```

#### HTTP

```bash
kubectl apply -f https://raw.githubusercontent.com/purpledb/purple/master/deploy/purple-http-k8s.yaml
```

#### Accessing the service

Once you've deployed purple on Kubernetes, you can access it in your local environment using port forwarding:

```bash
# gRPC
kubectl port-forward svc/purple-grpc 8081:8081

# HTTP
kubectl port-forward svc/purple-http 8080:8080
```

## Creator

Purple was created by [Luc Perkins](https://github.com/lucperkins), Developer Advocate at the [Cloud Native Computing Foundation](https://cncf.io) and author of the second edition of [Seven Databases in Seven Weeks: A Guide to Modern Databases and the NoSQL Movement](https://7dbs.io).
